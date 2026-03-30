from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_roles, require_tenant_context
from app.db.session import get_db
from app.models import User, UserRole
from app.schemas.admin import OrderRead
from app.schemas.waiter import (
    WaiterOrderCreate,
    WaiterOrderListResponse,
    WaiterOrderStatusUpdate,
    WaiterOrderUpdate,
    WaiterTableListResponse,
)
from app.services.orders import (
    claim_waiter_table,
    create_waiter_order,
    get_order,
    list_orders,
    list_waiter_tables,
    release_waiter_table,
    serialize_order,
    serialize_waiter_table,
    update_order_status,
    update_waiter_order,
)

router = APIRouter()


@router.get("/{slug}/tables", response_model=WaiterTableListResponse)
async def get_waiter_tables(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WAITER)),
) -> WaiterTableListResponse:
    ctx = await require_tenant_context(slug, db, current_user, allow_super_admin=False)
    claimed, available = await list_waiter_tables(db, ctx.tenant.id, current_user.id)
    return WaiterTableListResponse(
        claimed=[serialize_waiter_table(table) for table in claimed],
        available=[serialize_waiter_table(table) for table in available],
    )


@router.post("/{slug}/tables/{table_id}/claim", response_model=WaiterTableListResponse)
async def claim_table(
    slug: str,
    table_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WAITER)),
) -> WaiterTableListResponse:
    ctx = await require_tenant_context(slug, db, current_user, allow_super_admin=False)
    await claim_waiter_table(db, ctx.tenant.id, current_user, table_id)
    await db.commit()
    claimed, available = await list_waiter_tables(db, ctx.tenant.id, current_user.id)
    return WaiterTableListResponse(
        claimed=[serialize_waiter_table(table) for table in claimed],
        available=[serialize_waiter_table(table) for table in available],
    )


@router.post("/{slug}/tables/{table_id}/release", response_model=WaiterTableListResponse)
async def release_table(
    slug: str,
    table_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WAITER)),
) -> WaiterTableListResponse:
    ctx = await require_tenant_context(slug, db, current_user, allow_super_admin=False)
    await release_waiter_table(db, ctx.tenant.id, current_user, table_id)
    await db.commit()
    claimed, available = await list_waiter_tables(db, ctx.tenant.id, current_user.id)
    return WaiterTableListResponse(
        claimed=[serialize_waiter_table(table) for table in claimed],
        available=[serialize_waiter_table(table) for table in available],
    )


@router.get("/{slug}/orders", response_model=WaiterOrderListResponse)
async def list_waiter_orders(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WAITER)),
) -> WaiterOrderListResponse:
    ctx = await require_tenant_context(slug, db, current_user, allow_super_admin=False)
    claimed, _available = await list_waiter_tables(db, ctx.tenant.id, current_user.id)
    orders = await list_orders(db, ctx.tenant.id, include_closed=False, table_ids=[table.id for table in claimed])
    return WaiterOrderListResponse(items=[serialize_order(order) for order in orders])


@router.post("/{slug}/orders", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_waiter_managed_order(
    slug: str,
    payload: WaiterOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WAITER)),
) -> OrderRead:
    ctx = await require_tenant_context(slug, db, current_user, allow_super_admin=False)
    order = await create_waiter_order(db, ctx.tenant.id, current_user, payload)
    await db.commit()
    order = await get_order(db, ctx.tenant.id, order.id)
    return serialize_order(order)


@router.put("/{slug}/orders/{order_id}", response_model=OrderRead)
async def update_waiter_managed_order(
    slug: str,
    order_id: str,
    payload: WaiterOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WAITER)),
) -> OrderRead:
    ctx = await require_tenant_context(slug, db, current_user, allow_super_admin=False)
    await update_waiter_order(db, ctx.tenant.id, current_user.id, order_id, payload)
    await db.commit()
    order = await get_order(db, ctx.tenant.id, order_id)
    return serialize_order(order)


@router.put("/{slug}/orders/{order_id}/status", response_model=OrderRead)
async def update_waiter_order_status(
    slug: str,
    order_id: str,
    payload: WaiterOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WAITER)),
) -> OrderRead:
    ctx = await require_tenant_context(slug, db, current_user, allow_super_admin=False)
    await update_order_status(db, ctx.tenant.id, current_user, order_id, payload.status)
    await db.commit()
    order = await get_order(db, ctx.tenant.id, order_id)
    return serialize_order(order)
