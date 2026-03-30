import secrets
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps.auth import require_roles, require_tenant_context
from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models import Device, Menu, MenuItem, MenuSection, Order, OrderItem, OrderStatus, Table, User, UserRole
from app.schemas.admin import (
    ALLOWED_MENU_TAGS,
    MANAGED_STAFF_ROLES,
    AdminOperationsSummary,
    DeviceCreate,
    DeviceRead,
    DeviceUpdate,
    MenuCreate,
    MenuItemCreate,
    MenuItemRead,
    MenuItemUpdate,
    MenuRead,
    MenuSectionCreate,
    MenuSectionRead,
    MenuSectionUpdate,
    OrderRead,
    StaffAccountCreate,
    StaffAccountRead,
    StaffAccountUpdate,
    TableAdminRead,
    TableCreate,
    TableUpdate,
)
from app.services.audit import record_audit
from app.services.media import build_media_url, delete_media_url, save_menu_item_image
from app.services.orders import ACTIVE_ORDER_STATUSES, list_orders, serialize_order
from app.services.tenants import tenant_day_bounds_utc

router = APIRouter()
settings = get_settings()


async def _tenant_guard(slug: str, db: AsyncSession, user: User):
    return await require_tenant_context(slug, db, user)


def _validate_tags(tags: list[str]) -> None:
    invalid = sorted(set(tags) - ALLOWED_MENU_TAGS)
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Unsupported tags: {', '.join(invalid)}",
        )


def _validate_staff_role(role: UserRole) -> None:
    if role not in MANAGED_STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Admins can only manage tenant admin, waiter, and kitchen accounts",
        )


def _serialize_table(table: Table) -> TableAdminRead:
    return TableAdminRead(
        id=table.id,
        tenant_id=table.tenant_id,
        table_number=table.table_number,
        code=table.code,
        qr_code_url=table.qr_code_url,
        current_waiter_user_id=table.current_waiter_user_id,
        current_waiter_name=table.current_waiter.full_name if table.current_waiter else None,
        claimed_at=table.claimed_at,
    )


async def _get_menu_section(db: AsyncSession, tenant_id: str, section_id: str) -> MenuSection:
    result = await db.execute(select(MenuSection).where(MenuSection.id == section_id))
    section = result.scalar_one_or_none()
    if section is None or section.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu section not found")
    return section


async def _get_menu_item(db: AsyncSession, tenant_id: str, item_id: str) -> MenuItem:
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if item is None or item.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    return item


async def _get_table(db: AsyncSession, tenant_id: str, table_id: str) -> Table:
    result = await db.execute(select(Table).options(selectinload(Table.current_waiter)).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if table is None or table.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    return table


async def _get_device(db: AsyncSession, tenant_id: str, device_id: str) -> Device:
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if device is None or device.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


async def _get_tenant_user(db: AsyncSession, tenant_id: str, user_id: str) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or user.tenant_id != tenant_id or user.role not in MANAGED_STAFF_ROLES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def _validate_current_waiter(db: AsyncSession, tenant_id: str, waiter_user_id: str | None) -> None:
    if waiter_user_id is None:
        return
    waiter = await _get_tenant_user(db, tenant_id, waiter_user_id)
    if waiter.role != UserRole.WAITER:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Assigned claimant must be a waiter")


@router.get("/{slug}/menus", response_model=list[MenuRead])
async def list_menus(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[MenuRead]:
    ctx = await _tenant_guard(slug, db, current_user)
    result = await db.execute(select(Menu).where(Menu.tenant_id == ctx.tenant.id).order_by(Menu.created_at.desc()))
    return list(result.scalars())


@router.post("/{slug}/menus", response_model=MenuRead, status_code=status.HTTP_201_CREATED)
async def create_menu(
    slug: str,
    payload: MenuCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuRead:
    ctx = await _tenant_guard(slug, db, current_user)
    menu = Menu(tenant_id=ctx.tenant.id, name=payload.name, is_active=payload.is_active)
    db.add(menu)
    await db.flush()
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="menu_created",
        entity_name="menu",
        entity_id=menu.id,
        payload=payload.model_dump(),
    )
    await db.commit()
    await db.refresh(menu)
    return menu


@router.get("/{slug}/menu-sections", response_model=list[MenuSectionRead])
async def list_sections(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[MenuSectionRead]:
    ctx = await _tenant_guard(slug, db, current_user)
    result = await db.execute(
        select(MenuSection).where(MenuSection.tenant_id == ctx.tenant.id).order_by(MenuSection.display_order.asc())
    )
    return list(result.scalars())


@router.post("/{slug}/menu-sections", response_model=MenuSectionRead, status_code=status.HTTP_201_CREATED)
async def create_section(
    slug: str,
    payload: MenuSectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuSectionRead:
    ctx = await _tenant_guard(slug, db, current_user)
    menu_result = await db.execute(select(Menu).where(Menu.id == payload.menu_id, Menu.tenant_id == ctx.tenant.id))
    menu = menu_result.scalar_one_or_none()
    if menu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu not found")

    section = MenuSection(
        tenant_id=ctx.tenant.id,
        menu_id=payload.menu_id,
        name=payload.name,
        display_order=payload.display_order,
    )
    db.add(section)
    await db.flush()
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="menu_section_created",
        entity_name="menu_section",
        entity_id=section.id,
        payload=payload.model_dump(),
    )
    await db.commit()
    await db.refresh(section)
    return section


@router.put("/{slug}/menu-sections/{section_id}", response_model=MenuSectionRead)
async def update_section(
    slug: str,
    section_id: str,
    payload: MenuSectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuSectionRead:
    ctx = await _tenant_guard(slug, db, current_user)
    section = await _get_menu_section(db, ctx.tenant.id, section_id)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(section, field, value)

    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="menu_section_updated",
        entity_name="menu_section",
        entity_id=section.id,
        payload=updates,
    )
    await db.commit()
    await db.refresh(section)
    return section


@router.delete("/{slug}/menu-sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    slug: str,
    section_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    ctx = await _tenant_guard(slug, db, current_user)
    section = await _get_menu_section(db, ctx.tenant.id, section_id)
    item_result = await db.execute(select(MenuItem.id).where(MenuItem.section_id == section.id).limit(1))
    if item_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Delete or move the section's items before removing the section",
        )
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="menu_section_deleted",
        entity_name="menu_section",
        entity_id=section.id,
        payload={"name": section.name},
    )
    await db.delete(section)
    await db.commit()


@router.get("/{slug}/menu-items", response_model=list[MenuItemRead])
async def list_menu_items(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[MenuItemRead]:
    ctx = await _tenant_guard(slug, db, current_user)
    result = await db.execute(
        select(MenuItem).where(MenuItem.tenant_id == ctx.tenant.id).order_by(MenuItem.display_order.asc())
    )
    return list(result.scalars())


@router.post("/{slug}/menu-items", response_model=MenuItemRead, status_code=status.HTTP_201_CREATED)
async def create_menu_item(
    slug: str,
    payload: MenuItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuItemRead:
    ctx = await _tenant_guard(slug, db, current_user)
    _validate_tags(payload.tags)
    section_result = await db.execute(
        select(MenuSection).where(
            MenuSection.id == payload.section_id,
            MenuSection.menu_id == payload.menu_id,
            MenuSection.tenant_id == ctx.tenant.id,
        )
    )
    section = section_result.scalar_one_or_none()
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu section not found")

    item = MenuItem(tenant_id=ctx.tenant.id, **payload.model_dump())
    db.add(item)
    await db.flush()
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="menu_item_created",
        entity_name="menu_item",
        entity_id=item.id,
        payload=payload.model_dump(mode="json"),
    )
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{slug}/menu-items/{item_id}", response_model=MenuItemRead)
async def update_menu_item(
    slug: str,
    item_id: str,
    payload: MenuItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuItemRead:
    ctx = await _tenant_guard(slug, db, current_user)
    item = await _get_menu_item(db, ctx.tenant.id, item_id)

    updates = payload.model_dump(exclude_unset=True)
    if "tags" in updates and updates["tags"] is not None:
        _validate_tags(updates["tags"])
    if "menu_id" in updates or "section_id" in updates:
        target_menu_id = updates.get("menu_id", item.menu_id)
        target_section_id = updates.get("section_id", item.section_id)
        section_result = await db.execute(
            select(MenuSection).where(
                MenuSection.id == target_section_id,
                MenuSection.menu_id == target_menu_id,
                MenuSection.tenant_id == ctx.tenant.id,
            )
        )
        if section_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu section not found")
    for field, value in updates.items():
        setattr(item, field, value)

    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="menu_item_updated",
        entity_name="menu_item",
        entity_id=item.id,
        payload=updates,
    )
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{slug}/menu-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(
    slug: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    ctx = await _tenant_guard(slug, db, current_user)
    item = await _get_menu_item(db, ctx.tenant.id, item_id)
    usage_result = await db.execute(select(OrderItem.id).where(OrderItem.menu_item_id == item.id).limit(1))
    if usage_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Items with order history cannot be deleted. Mark the item unavailable instead.",
        )
    delete_media_url(item.image_url)
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="menu_item_deleted",
        entity_name="menu_item",
        entity_id=item.id,
        payload={"name": item.name},
    )
    await db.delete(item)
    await db.commit()


@router.post("/{slug}/menu-items/{item_id}/image", response_model=MenuItemRead)
async def upload_menu_item_image(
    slug: str,
    item_id: str,
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuItemRead:
    ctx = await _tenant_guard(slug, db, current_user)
    item = await _get_menu_item(db, ctx.tenant.id, item_id)
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Upload a valid image file")

    delete_media_url(item.image_url)
    relative_path = await save_menu_item_image(ctx.tenant.slug, item.id, image)
    item.image_url = build_media_url(relative_path)
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="menu_item_image_uploaded",
        entity_name="menu_item",
        entity_id=item.id,
        payload={"image_url": item.image_url},
    )
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{slug}/menu-items/{item_id}/image", response_model=MenuItemRead)
async def remove_menu_item_image(
    slug: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> MenuItemRead:
    ctx = await _tenant_guard(slug, db, current_user)
    item = await _get_menu_item(db, ctx.tenant.id, item_id)
    delete_media_url(item.image_url)
    item.image_url = None
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="menu_item_image_removed",
        entity_name="menu_item",
        entity_id=item.id,
    )
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/{slug}/tables", response_model=list[TableAdminRead])
async def list_tables(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[TableAdminRead]:
    ctx = await _tenant_guard(slug, db, current_user)
    result = await db.execute(
        select(Table).options(selectinload(Table.current_waiter)).where(Table.tenant_id == ctx.tenant.id).order_by(Table.table_number)
    )
    return [_serialize_table(table) for table in result.scalars()]


@router.post("/{slug}/tables", response_model=TableAdminRead, status_code=status.HTTP_201_CREATED)
async def create_table(
    slug: str,
    payload: TableCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> TableAdminRead:
    ctx = await _tenant_guard(slug, db, current_user)
    code = secrets.token_urlsafe(6).lower()
    qr_code_url = payload.qr_code_url or f"{settings.FRONTEND_ORIGIN}/r/{slug}/t/{code}"
    table = Table(tenant_id=ctx.tenant.id, table_number=payload.table_number, code=code, qr_code_url=qr_code_url)
    db.add(table)
    await db.flush()
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="table_created",
        entity_name="table",
        entity_id=table.id,
        payload={"table_number": payload.table_number, "code": code},
    )
    await db.commit()
    return _serialize_table(await _get_table(db, ctx.tenant.id, table.id))


@router.put("/{slug}/tables/{table_id}", response_model=TableAdminRead)
async def update_table(
    slug: str,
    table_id: str,
    payload: TableUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> TableAdminRead:
    ctx = await _tenant_guard(slug, db, current_user)
    table = await _get_table(db, ctx.tenant.id, table_id)

    updates = payload.model_dump(exclude_unset=True)
    if "current_waiter_user_id" in updates:
        await _validate_current_waiter(db, ctx.tenant.id, updates["current_waiter_user_id"])
        if updates["current_waiter_user_id"] is None:
            table.claimed_at = None
        else:
            from datetime import UTC, datetime

            table.claimed_at = datetime.now(UTC)
    for field, value in updates.items():
        setattr(table, field, value)

    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="table_updated",
        entity_name="table",
        entity_id=table.id,
        payload=updates,
    )
    await db.commit()
    return _serialize_table(await _get_table(db, ctx.tenant.id, table.id))


@router.delete("/{slug}/tables/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(
    slug: str,
    table_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    ctx = await _tenant_guard(slug, db, current_user)
    table = await _get_table(db, ctx.tenant.id, table_id)
    order_result = await db.execute(select(Order.id).where(Order.table_id == table.id).limit(1))
    if order_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tables with order history cannot be deleted",
        )
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="table_deleted",
        entity_name="table",
        entity_id=table.id,
        payload={"table_number": table.table_number},
    )
    await db.delete(table)
    await db.commit()


@router.get("/{slug}/devices", response_model=list[DeviceRead])
async def list_devices(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[DeviceRead]:
    ctx = await _tenant_guard(slug, db, current_user)
    result = await db.execute(select(Device).where(Device.tenant_id == ctx.tenant.id).order_by(Device.created_at.desc()))
    return list(result.scalars())


@router.post("/{slug}/devices", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
async def create_device(
    slug: str,
    payload: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> DeviceRead:
    ctx = await _tenant_guard(slug, db, current_user)
    if payload.assigned_table_id:
        await _get_table(db, ctx.tenant.id, payload.assigned_table_id)

    device = Device(tenant_id=ctx.tenant.id, **payload.model_dump())
    db.add(device)
    await db.flush()
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="device_created",
        entity_name="device",
        entity_id=device.id,
        payload=payload.model_dump(mode="json"),
    )
    await db.commit()
    await db.refresh(device)
    return device


@router.put("/{slug}/devices/{device_id}", response_model=DeviceRead)
async def update_device(
    slug: str,
    device_id: str,
    payload: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> DeviceRead:
    ctx = await _tenant_guard(slug, db, current_user)
    device = await _get_device(db, ctx.tenant.id, device_id)

    if payload.assigned_table_id:
        await _get_table(db, ctx.tenant.id, payload.assigned_table_id)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(device, field, value)
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="device_updated",
        entity_name="device",
        entity_id=device.id,
        payload=updates,
    )
    await db.commit()
    await db.refresh(device)
    return device


@router.delete("/{slug}/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    slug: str,
    device_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    ctx = await _tenant_guard(slug, db, current_user)
    device = await _get_device(db, ctx.tenant.id, device_id)
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="device_deleted",
        entity_name="device",
        entity_id=device.id,
        payload={"label": device.label},
    )
    await db.delete(device)
    await db.commit()


@router.get("/{slug}/orders", response_model=list[OrderRead])
async def list_admin_orders(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[OrderRead]:
    ctx = await _tenant_guard(slug, db, current_user)
    orders = await list_orders(db, ctx.tenant.id)
    return [serialize_order(order) for order in orders]


@router.get("/{slug}/reports/summary", response_model=AdminOperationsSummary)
async def get_reports_summary(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminOperationsSummary:
    ctx = await _tenant_guard(slug, db, current_user)
    orders = await list_orders(db, ctx.tenant.id)
    start_of_day, end_of_day = tenant_day_bounds_utc(ctx.tenant)

    orders_today = [order for order in orders if start_of_day <= order.created_at < end_of_day]
    closed_today = [order for order in orders_today if order.status == OrderStatus.CLOSED]
    active_order_count = sum(1 for order in orders if order.status in ACTIVE_ORDER_STATUSES)
    ready_backlog = sum(1 for order in orders if order.status == OrderStatus.READY)
    active_tables = len({order.table_id for order in orders if order.status in ACTIVE_ORDER_STATUSES})
    gross_sales_today = sum(
        (Decimal(str(order.total_price)) for order in orders_today if order.status == OrderStatus.CLOSED),
        start=Decimal("0"),
    )

    return AdminOperationsSummary(
        orders_today=len(orders_today),
        ready_backlog=ready_backlog,
        active_orders=active_order_count,
        closed_today=len(closed_today),
        gross_sales_today=gross_sales_today,
        active_tables=active_tables,
    )


@router.get("/{slug}/users", response_model=list[StaffAccountRead])
@router.get("/{slug}/staff", response_model=list[StaffAccountRead], include_in_schema=False)
async def list_staff_accounts(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[StaffAccountRead]:
    ctx = await _tenant_guard(slug, db, current_user)
    result = await db.execute(
        select(User)
        .where(User.tenant_id == ctx.tenant.id, User.role.in_(list(MANAGED_STAFF_ROLES)))
        .order_by(User.created_at.desc())
    )
    return list(result.scalars())


@router.post("/{slug}/users", response_model=StaffAccountRead, status_code=status.HTTP_201_CREATED)
@router.post("/{slug}/staff", response_model=StaffAccountRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_staff_account(
    slug: str,
    payload: StaffAccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> StaffAccountRead:
    ctx = await _tenant_guard(slug, db, current_user)
    _validate_staff_role(payload.role)

    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = User(
        tenant_id=ctx.tenant.id,
        full_name=payload.full_name,
        email=payload.email.lower(),
        role=payload.role,
        is_active=payload.is_active,
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    await db.flush()
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="tenant_user_created",
        entity_name="user",
        entity_id=user.id,
        payload={"email": user.email, "role": user.role.value},
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{slug}/users/{user_id}", response_model=StaffAccountRead)
@router.put("/{slug}/staff/{user_id}", response_model=StaffAccountRead, include_in_schema=False)
async def update_staff_account(
    slug: str,
    user_id: str,
    payload: StaffAccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> StaffAccountRead:
    ctx = await _tenant_guard(slug, db, current_user)
    user = await _get_tenant_user(db, ctx.tenant.id, user_id)

    updates = payload.model_dump(exclude_unset=True)
    if "role" in updates:
        _validate_staff_role(updates["role"])
    if "email" in updates and updates["email"] is not None:
        updates["email"] = updates["email"].lower()
    if "password" in updates and updates["password"] is not None:
        user.password_hash = get_password_hash(updates.pop("password"))

    for field, value in updates.items():
        setattr(user, field, value)

    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="tenant_user_updated",
        entity_name="user",
        entity_id=user.id,
        payload=updates,
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{slug}/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{slug}/staff/{user_id}", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
async def delete_staff_account(
    slug: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    ctx = await _tenant_guard(slug, db, current_user)
    user = await _get_tenant_user(db, ctx.tenant.id, user_id)
    await record_audit(
        db,
        tenant_id=ctx.tenant.id,
        actor_user_id=current_user.id,
        action="tenant_user_deleted",
        entity_name="user",
        entity_id=user.id,
        payload={"email": user.email, "role": user.role.value},
    )
    await db.delete(user)
    await db.commit()
