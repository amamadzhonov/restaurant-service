from pydantic import BaseModel

from app.models import OrderStatus

from .admin import OrderRead


class StaffOrderItemCreate(BaseModel):
    menu_item_id: str
    quantity: int = 1


class StaffOrderCreate(BaseModel):
    table_id: str
    notes: str | None = None
    items: list[StaffOrderItemCreate]


class StaffOrderStatusUpdate(BaseModel):
    status: OrderStatus


class StaffOrderListResponse(BaseModel):
    items: list[OrderRead]

