from datetime import datetime

from pydantic import BaseModel

from app.models import OrderStatus

from .admin import OrderRead
from .common import AppBaseModel


class WaiterOrderItemUpdate(BaseModel):
    menu_item_id: str
    quantity: int = 1


class WaiterOrderUpdate(BaseModel):
    notes: str | None = None
    items: list[WaiterOrderItemUpdate] | None = None


class WaiterOrderCreate(BaseModel):
    table_id: str
    guest_name: str | None = None
    notes: str | None = None
    items: list[WaiterOrderItemUpdate]


class WaiterOrderStatusUpdate(BaseModel):
    status: OrderStatus


class WaiterTableRead(AppBaseModel):
    id: str
    tenant_id: str
    table_number: str
    code: str
    qr_code_url: str | None = None
    current_waiter_user_id: str | None = None
    current_waiter_name: str | None = None
    claimed_at: datetime | None = None
    active_order_count: int


class WaiterTableListResponse(AppBaseModel):
    claimed: list[WaiterTableRead]
    available: list[WaiterTableRead]


class WaiterOrderListResponse(BaseModel):
    items: list[OrderRead]
