from pydantic import BaseModel

from app.models import OrderStatus

from .admin import OrderRead


class KitchenOrderStatusUpdate(BaseModel):
    status: OrderStatus


class KitchenOrderListResponse(BaseModel):
    items: list[OrderRead]
