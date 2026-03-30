import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps.auth import require_roles
from app.db.session import get_db
from app.models import Order, OrderStatus, PasswordResetToken, Tenant, User, UserRole
from app.schemas.platform import (
    PasswordResetRequest,
    PasswordResetTokenRead,
    PlatformDeviceRead,
    PlatformOrderSnapshot,
    PlatformRestaurantDetailRead,
    PlatformRestaurantListRead,
    TenantAccessUpdate,
)
from app.services.audit import record_audit
from app.services.tenants import tenant_day_bounds_utc

router = APIRouter(prefix="/platform")

TENANT_LOAD_OPTIONS = (
    selectinload(Tenant.users),
    selectinload(Tenant.devices),
    selectinload(Tenant.orders).selectinload(Order.table),
)


def _restaurant_list_row(tenant: Tenant) -> PlatformRestaurantListRead:
    open_orders, closed_orders = _today_order_counts(tenant)
    admin_count = sum(1 for user in tenant.users if user.role == UserRole.ADMIN and user.is_active)
    return PlatformRestaurantListRead(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        subscription_plan=tenant.subscription_plan,
        subscription_status=tenant.subscription_status,
        grace_ends_at=tenant.grace_ends_at,
        is_accessible=tenant.is_accessible,
        admin_count=admin_count,
        device_count=len(tenant.devices),
        today_open_orders=open_orders,
        today_closed_orders=closed_orders,
    )


def _restaurant_detail(tenant: Tenant) -> PlatformRestaurantDetailRead:
    open_orders, closed_orders = _today_order_counts(tenant)
    ready_backlog = sum(1 for order in tenant.orders if order.status == OrderStatus.READY)
    active_tables = len(
        {
            order.table_id
            for order in tenant.orders
            if order.status in {OrderStatus.PLACED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED}
        }
    )
    recent_orders = sorted(
        [order for order in tenant.orders if _is_order_today(tenant, order)],
        key=lambda order: order.created_at,
        reverse=True,
    )[:10]
    return PlatformRestaurantDetailRead(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        address=tenant.address,
        timezone=tenant.timezone,
        currency=tenant.currency,
        subscription_plan=tenant.subscription_plan,
        subscription_status=tenant.subscription_status,
        grace_ends_at=tenant.grace_ends_at,
        is_accessible=tenant.is_accessible,
        admin_count=sum(1 for user in tenant.users if user.role == UserRole.ADMIN and user.is_active),
        device_count=len(tenant.devices),
        today_open_orders=open_orders,
        today_closed_orders=closed_orders,
        ready_backlog=ready_backlog,
        active_tables=active_tables,
        users=[user for user in tenant.users if user.role in {UserRole.ADMIN, UserRole.WAITER, UserRole.KITCHEN}],
        devices=[PlatformDeviceRead.model_validate(device) for device in tenant.devices],
        recent_orders=[
            PlatformOrderSnapshot(
                id=order.id,
                table_id=order.table_id,
                table_number=order.table.table_number if order.table else order.table_id,
                guest_name=order.guest_name,
                status=order.status,
                source=order.source,
                total_price=order.total_price,
                created_at=order.created_at,
                status_changed_at=order.status_changed_at,
            )
            for order in recent_orders
        ],
    )


def _today_order_counts(tenant: Tenant) -> tuple[int, int]:
    todays_orders = [order for order in tenant.orders if _is_order_today(tenant, order)]
    open_orders = sum(
        1
        for order in todays_orders
        if order.status in {OrderStatus.PLACED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED}
    )
    closed_orders = sum(1 for order in todays_orders if order.status == OrderStatus.CLOSED)
    return open_orders, closed_orders


def _is_order_today(tenant: Tenant, order: Order) -> bool:
    start_of_day, end_of_day = tenant_day_bounds_utc(tenant)
    return start_of_day <= order.created_at < end_of_day


@router.get("/restaurants", response_model=list[PlatformRestaurantListRead])
@router.get("/tenants", response_model=list[PlatformRestaurantListRead], include_in_schema=False)
async def list_platform_restaurants(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> list[PlatformRestaurantListRead]:
    result = await db.execute(select(Tenant).options(*TENANT_LOAD_OPTIONS).order_by(Tenant.created_at.desc()))
    tenants = list(result.scalars())
    return [_restaurant_list_row(tenant) for tenant in tenants]


@router.get("/restaurants/{slug}", response_model=PlatformRestaurantDetailRead)
async def get_platform_restaurant_detail(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> PlatformRestaurantDetailRead:
    result = await db.execute(select(Tenant).options(*TENANT_LOAD_OPTIONS).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    return _restaurant_detail(tenant)


@router.put("/restaurants/{slug}/access", response_model=PlatformRestaurantDetailRead)
@router.put("/tenants/{tenant_id}/access", response_model=PlatformRestaurantDetailRead, include_in_schema=False)
async def update_tenant_access(
    slug: str | None = None,
    tenant_id: str | None = None,
    payload: TenantAccessUpdate | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> PlatformRestaurantDetailRead:
    stmt = select(Tenant).options(*TENANT_LOAD_OPTIONS)
    if slug is not None:
        stmt = stmt.where(Tenant.slug == slug)
    elif tenant_id is not None:
        stmt = stmt.where(Tenant.id == tenant_id)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    if tenant is None or payload is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    tenant.is_accessible = payload.is_accessible
    await record_audit(
        db,
        tenant_id=tenant.id,
        actor_user_id=current_user.id,
        action="tenant_access_updated",
        entity_name="tenant",
        entity_id=tenant.id,
        payload={"is_accessible": payload.is_accessible},
    )
    await db.commit()

    refreshed = await db.execute(select(Tenant).options(*TENANT_LOAD_OPTIONS).where(Tenant.id == tenant.id))
    return _restaurant_detail(refreshed.scalar_one())


@router.post("/users/{user_id}/reset-password", response_model=PasswordResetTokenRead, status_code=status.HTTP_201_CREATED)
async def create_password_reset_token(
    user_id: str,
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> PasswordResetTokenRead:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or user.tenant_id is None or user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant user not found")

    expires_in_hours = max(1, min(payload.expires_in_hours, 72))
    token = PasswordResetToken(
        tenant_id=user.tenant_id,
        user_id=user.id,
        requested_by_user_id=current_user.id,
        token=secrets.token_urlsafe(24),
        expires_at=datetime.now(UTC) + timedelta(hours=expires_in_hours),
    )
    db.add(token)
    await db.flush()
    await record_audit(
        db,
        tenant_id=user.tenant_id,
        actor_user_id=current_user.id,
        action="password_reset_token_created",
        entity_name="user",
        entity_id=user.id,
        payload={"email": user.email, "expires_in_hours": expires_in_hours},
    )
    await db.commit()
    return PasswordResetTokenRead(user_id=user.id, token=token.token, expires_at=token.expires_at)
