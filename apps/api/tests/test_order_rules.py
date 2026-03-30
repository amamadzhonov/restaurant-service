import pytest
from fastapi import HTTPException

from app.models import Order, OrderStatus, Table, User, UserRole
from app.services.orders import ensure_role_can_transition, ensure_transition, serialize_waiter_table


def test_valid_transition_from_placed_to_preparing() -> None:
    ensure_transition(OrderStatus.PLACED, OrderStatus.PREPARING)


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (OrderStatus.PLACED, OrderStatus.CLOSED),
        (OrderStatus.SERVED, OrderStatus.PREPARING),
        (OrderStatus.CANCELLED, OrderStatus.PLACED),
    ],
)
def test_invalid_transition_raises(current: OrderStatus, target: OrderStatus) -> None:
    with pytest.raises(HTTPException):
        ensure_transition(current, target)


def test_kitchen_can_move_preparing_to_ready() -> None:
    ensure_role_can_transition(UserRole.KITCHEN, OrderStatus.PREPARING, OrderStatus.READY)


def test_waiter_cannot_move_placed_to_preparing() -> None:
    with pytest.raises(HTTPException):
        ensure_role_can_transition(UserRole.WAITER, OrderStatus.PLACED, OrderStatus.PREPARING)


def test_waiter_table_serializer_counts_only_active_orders() -> None:
    waiter = User(id="waiter-1", full_name="Floor Waiter", email="waiter@example.com", password_hash="hash")
    table = Table(
        id="table-1",
        tenant_id="tenant-1",
        table_number="A1",
        code="table-a1",
        current_waiter_user_id=waiter.id,
        current_waiter=waiter,
        orders=[
            Order(id="order-1", tenant_id="tenant-1", table_id="table-1", status=OrderStatus.PLACED),
            Order(id="order-2", tenant_id="tenant-1", table_id="table-1", status=OrderStatus.CLOSED),
        ],
    )

    payload = serialize_waiter_table(table)

    assert payload.current_waiter_name == "Floor Waiter"
    assert payload.active_order_count == 1
