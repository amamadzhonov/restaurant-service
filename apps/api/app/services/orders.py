from __future__ import annotations

import secrets
from collections.abc import Iterable
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    MenuItem,
    Order,
    OrderItem,
    OrderSource,
    OrderStatus,
    Table,
    Tenant,
    User,
    UserRole,
)
from app.schemas.admin import OrderItemRead, OrderRead
from app.schemas.public import PublicOrderCreate, PublicOrderStatusRead
from app.schemas.waiter import WaiterOrderCreate, WaiterOrderUpdate, WaiterTableRead
from app.services.audit import record_audit
from app.services.billing import tenant_access_locked

ORDER_LOAD_OPTIONS = (
    selectinload(Order.table),
    selectinload(Order.items).selectinload(OrderItem.menu_item),
    selectinload(Order.created_by_user),
    selectinload(Order.served_by_user),
    selectinload(Order.closed_by_user),
)

TABLE_LOAD_OPTIONS = (
    selectinload(Table.current_waiter),
    selectinload(Table.orders),
)

ACTIVE_ORDER_STATUSES = {
    OrderStatus.PLACED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.SERVED,
}

ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PLACED: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
    OrderStatus.PREPARING: {OrderStatus.READY, OrderStatus.CANCELLED},
    OrderStatus.READY: {OrderStatus.SERVED, OrderStatus.CANCELLED},
    OrderStatus.SERVED: {OrderStatus.CLOSED},
    OrderStatus.CLOSED: set(),
    OrderStatus.CANCELLED: set(),
}

ROLE_ALLOWED_TARGETS: dict[UserRole, set[OrderStatus]] = {
    UserRole.SUPER_ADMIN: set(OrderStatus),
    UserRole.ADMIN: set(OrderStatus),
    UserRole.KITCHEN: {OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.CANCELLED},
    UserRole.WAITER: {OrderStatus.SERVED, OrderStatus.CLOSED, OrderStatus.CANCELLED},
}


def ensure_transition(current: OrderStatus, target: OrderStatus) -> None:
    if current == target:
        return
    if target not in ALLOWED_TRANSITIONS[current]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Invalid order status transition from {current.value} to {target.value}",
        )


def ensure_role_can_transition(actor_role: UserRole, current: OrderStatus, target: OrderStatus) -> None:
    ensure_transition(current, target)
    if target not in ROLE_ALLOWED_TARGETS.get(actor_role, set()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{actor_role.value} cannot move orders to {target.value}",
        )


def serialize_order(order: Order) -> OrderRead:
    return OrderRead(
        id=order.id,
        tenant_id=order.tenant_id,
        table_id=order.table_id,
        table_number=order.table.table_number if order.table else order.table_id,
        created_by_user_id=order.created_by_user_id,
        served_by_user_id=order.served_by_user_id,
        closed_by_user_id=order.closed_by_user_id,
        source=order.source,
        guest_name=order.guest_name,
        public_status_token=order.public_status_token,
        status=order.status,
        total_price=Decimal(str(order.total_price)),
        notes=order.notes,
        placed_at=order.placed_at,
        ready_at=order.ready_at,
        served_at=order.served_at,
        closed_at=order.closed_at,
        created_at=order.created_at,
        status_changed_at=order.status_changed_at,
        items=[
            OrderItemRead(
                id=item.id,
                menu_item_id=item.menu_item_id,
                menu_item_name=item.menu_item.name if item.menu_item else item.menu_item_id,
                quantity=item.quantity,
                price=Decimal(str(item.price)),
            )
            for item in order.items
        ],
    )


def serialize_public_order(order: Order) -> PublicOrderStatusRead:
    return PublicOrderStatusRead(
        order_id=order.id,
        public_status_token=order.public_status_token,
        table_number=order.table.table_number if order.table else order.table_id,
        guest_name=order.guest_name,
        status=order.status,
        notes=order.notes,
        total_price=Decimal(str(order.total_price)),
        placed_at=order.placed_at,
        ready_at=order.ready_at,
        served_at=order.served_at,
        items=[
            {
                "menu_item_id": item.menu_item_id,
                "menu_item_name": item.menu_item.name if item.menu_item else item.menu_item_id,
                "quantity": item.quantity,
                "price": Decimal(str(item.price)),
            }
            for item in order.items
        ],
    )


def serialize_waiter_table(table: Table) -> WaiterTableRead:
    active_order_count = sum(1 for order in table.orders if order.status in ACTIVE_ORDER_STATUSES)
    return WaiterTableRead(
        id=table.id,
        tenant_id=table.tenant_id,
        table_number=table.table_number,
        code=table.code,
        qr_code_url=table.qr_code_url,
        current_waiter_user_id=table.current_waiter_user_id,
        current_waiter_name=table.current_waiter.full_name if table.current_waiter else None,
        claimed_at=table.claimed_at,
        active_order_count=active_order_count,
    )


async def list_orders(
    db: AsyncSession,
    tenant_id: str,
    *,
    statuses: Iterable[OrderStatus] | None = None,
    include_closed: bool = True,
    table_ids: Iterable[str] | None = None,
) -> list[Order]:
    stmt = select(Order).options(*ORDER_LOAD_OPTIONS).where(Order.tenant_id == tenant_id)
    if table_ids is not None:
        table_ids = list(dict.fromkeys(table_ids))
        if not table_ids:
            return []
        stmt = stmt.where(Order.table_id.in_(table_ids))
    if statuses is not None:
        stmt = stmt.where(Order.status.in_(list(statuses)))
    elif not include_closed:
        stmt = stmt.where(Order.status.in_(list(ACTIVE_ORDER_STATUSES)))
    stmt = stmt.order_by(Order.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars())


async def get_order(db: AsyncSession, tenant_id: str, order_id: str) -> Order:
    result = await db.execute(
        select(Order).options(*ORDER_LOAD_OPTIONS).where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


async def get_public_order(db: AsyncSession, public_status_token: str) -> Order:
    result = await db.execute(
        select(Order).options(*ORDER_LOAD_OPTIONS).where(Order.public_status_token == public_status_token)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


async def list_waiter_tables(db: AsyncSession, tenant_id: str, waiter_id: str) -> tuple[list[Table], list[Table]]:
    result = await db.execute(
        select(Table).options(*TABLE_LOAD_OPTIONS).where(Table.tenant_id == tenant_id).order_by(Table.table_number.asc())
    )
    tables = list(result.scalars())
    claimed = [table for table in tables if table.current_waiter_user_id == waiter_id]
    available = [table for table in tables if table.current_waiter_user_id is None]
    return claimed, available


async def claim_waiter_table(db: AsyncSession, tenant_id: str, waiter: User, table_id: str) -> Table:
    table = await _get_tenant_table(db, tenant_id, table_id)
    previous_waiter_user_id = table.current_waiter_user_id
    now = datetime.now(UTC)
    table.current_waiter_user_id = waiter.id
    table.claimed_at = now
    await record_audit(
        db,
        tenant_id=tenant_id,
        actor_user_id=waiter.id,
        action="table_claimed",
        entity_name="table",
        entity_id=table.id,
        payload={
            "table_number": table.table_number,
            "previous_waiter_user_id": previous_waiter_user_id,
            "current_waiter_user_id": waiter.id,
            "transferred": previous_waiter_user_id not in {None, waiter.id},
        },
    )
    await db.flush()
    return await _get_tenant_table(db, tenant_id, table_id)


async def release_waiter_table(db: AsyncSession, tenant_id: str, waiter: User, table_id: str) -> Table:
    table = await _get_tenant_table(db, tenant_id, table_id)
    if table.current_waiter_user_id != waiter.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the current waiter can release a table")

    table.current_waiter_user_id = None
    table.claimed_at = None
    await record_audit(
        db,
        tenant_id=tenant_id,
        actor_user_id=waiter.id,
        action="table_released",
        entity_name="table",
        entity_id=table.id,
        payload={"table_number": table.table_number},
    )
    await db.flush()
    return await _get_tenant_table(db, tenant_id, table_id)


async def create_public_order(db: AsyncSession, table_code: str, payload: PublicOrderCreate) -> Order:
    tenant, table = await _get_tenant_table_by_code(db, table_code)
    now = datetime.now(UTC)

    if not tenant.is_accessible:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ordering is temporarily unavailable")
    if tenant_access_locked(tenant, now):
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Ordering is temporarily unavailable")

    guest_name = payload.guest_name.strip()
    if not guest_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Guest name is required")

    order = Order(
        tenant_id=tenant.id,
        table_id=table.id,
        source=OrderSource.QR_GUEST,
        guest_name=guest_name,
        notes=payload.notes,
        public_status_token=secrets.token_urlsafe(18),
        status=OrderStatus.PLACED,
        placed_at=now,
        status_changed_at=now,
    )
    db.add(order)
    await db.flush()
    await _replace_order_items(db, order, tenant.id, payload.items)
    await record_audit(
        db,
        tenant_id=tenant.id,
        actor_user_id=None,
        action="order_submitted",
        entity_name="order",
        entity_id=order.id,
        payload={
            "source": order.source.value,
            "table_number": table.table_number,
            "guest_name": guest_name,
        },
    )
    return await get_order(db, tenant.id, order.id)


async def create_waiter_order(db: AsyncSession, tenant_id: str, waiter: User, payload: WaiterOrderCreate) -> Order:
    table = await _get_tenant_table(db, tenant_id, payload.table_id)
    if table.current_waiter_user_id != waiter.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Claim this table before creating an assisted order",
        )

    guest_name = payload.guest_name.strip() if payload.guest_name else f"Table {table.table_number}"
    now = datetime.now(UTC)
    order = Order(
        tenant_id=tenant_id,
        table_id=table.id,
        created_by_user_id=waiter.id,
        source=OrderSource.STAFF_ASSISTED,
        guest_name=guest_name,
        notes=payload.notes,
        public_status_token=secrets.token_urlsafe(18),
        status=OrderStatus.PLACED,
        placed_at=now,
        status_changed_at=now,
    )
    db.add(order)
    await db.flush()
    await _replace_order_items(db, order, tenant_id, payload.items)
    await record_audit(
        db,
        tenant_id=tenant_id,
        actor_user_id=waiter.id,
        action="waiter_order_created",
        entity_name="order",
        entity_id=order.id,
        payload={"table_number": table.table_number, "source": order.source.value},
    )
    return await get_order(db, tenant_id, order.id)


async def update_waiter_order(
    db: AsyncSession,
    tenant_id: str,
    actor_user_id: str,
    order_id: str,
    payload: WaiterOrderUpdate,
) -> Order:
    order = await get_order(db, tenant_id, order_id)
    _require_waiter_table_owner(order, actor_user_id)
    if order.status in {OrderStatus.CLOSED, OrderStatus.CANCELLED}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Closed or cancelled orders cannot be edited",
        )

    updates = payload.model_dump(exclude_unset=True)
    if "notes" in updates:
        order.notes = updates["notes"]
    if payload.items is not None:
        await _replace_order_items(db, order, tenant_id, payload.items)

    await record_audit(
        db,
        tenant_id=tenant_id,
        actor_user_id=actor_user_id,
        action="order_updated_by_waiter",
        entity_name="order",
        entity_id=order.id,
        payload=updates,
    )
    return await get_order(db, tenant_id, order.id)


async def update_order_status(
    db: AsyncSession,
    tenant_id: str,
    actor: User,
    order_id: str,
    status_value: OrderStatus,
) -> Order:
    order = await get_order(db, tenant_id, order_id)
    if actor.role == UserRole.WAITER:
        _require_waiter_table_owner(order, actor.id)
    ensure_role_can_transition(actor.role, order.status, status_value)

    now = datetime.now(UTC)
    order.status = status_value
    order.status_changed_at = now
    if status_value == OrderStatus.READY:
        order.ready_at = now
    elif status_value == OrderStatus.SERVED:
        order.served_at = now
        order.served_by_user_id = actor.id
        if order.ready_at is None:
            order.ready_at = now
    elif status_value == OrderStatus.CLOSED:
        order.closed_at = now
        order.closed_by_user_id = actor.id
        if order.served_at is None:
            order.served_at = now
    await record_audit(
        db,
        tenant_id=tenant_id,
        actor_user_id=actor.id,
        action="order_status_updated",
        entity_name="order",
        entity_id=order.id,
        payload={"status": status_value.value},
    )
    return await get_order(db, tenant_id, order.id)


async def _get_tenant_table_by_code(db: AsyncSession, table_code: str) -> tuple[Tenant, Table]:
    result = await db.execute(
        select(Table).options(selectinload(Table.tenant)).where(Table.code == table_code)
    )
    table = result.scalar_one_or_none()
    if table is None or table.tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    return table.tenant, table


async def _get_tenant_table(db: AsyncSession, tenant_id: str, table_id: str) -> Table:
    result = await db.execute(
        select(Table).options(*TABLE_LOAD_OPTIONS).where(Table.id == table_id, Table.tenant_id == tenant_id)
    )
    table = result.scalar_one_or_none()
    if table is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    return table


async def _resolve_menu_items(
    db: AsyncSession,
    tenant_id: str,
    requested_items: Iterable[object],
) -> dict[str, MenuItem]:
    item_ids = [getattr(item, "menu_item_id") for item in requested_items]
    unique_item_ids = list(dict.fromkeys(item_ids))
    if not unique_item_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Order items are required")

    items_result = await db.execute(
        select(MenuItem).where(MenuItem.id.in_(unique_item_ids), MenuItem.tenant_id == tenant_id).order_by(MenuItem.name)
    )
    menu_items = {item.id: item for item in items_result.scalars().all()}
    if len(menu_items) != len(unique_item_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more menu items were not found")
    return menu_items


async def _replace_order_items(
    db: AsyncSession,
    order: Order,
    tenant_id: str,
    requested_items: Iterable[object],
) -> None:
    requested_items = list(requested_items)
    if not requested_items:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Order items are required")

    menu_items = await _resolve_menu_items(db, tenant_id, requested_items)
    await db.execute(delete(OrderItem).where(OrderItem.order_id == order.id))

    total = Decimal("0")
    for requested_item in requested_items:
        menu_item = menu_items[getattr(requested_item, "menu_item_id")]
        if not menu_item.is_available:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Menu item '{menu_item.name}' is unavailable",
            )
        quantity = int(getattr(requested_item, "quantity"))
        line_price = Decimal(str(menu_item.price)) * quantity
        total += line_price
        db.add(
            OrderItem(
                order_id=order.id,
                menu_item_id=menu_item.id,
                quantity=quantity,
                price=menu_item.price,
            )
        )

    order.total_price = total
    await db.flush()
    db.expire(order, ["items"])


def _require_waiter_table_owner(order: Order, waiter_id: str) -> None:
    if order.table is None or order.table.current_waiter_user_id != waiter_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Waiters can only manage orders for tables they currently serve",
        )
