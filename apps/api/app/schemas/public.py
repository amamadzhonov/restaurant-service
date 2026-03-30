from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models import OrderStatus

from .common import AppBaseModel


class PublicMenuItemRead(AppBaseModel):
    id: str
    name: str
    description: str | None = None
    price: Decimal
    image_url: str | None = None
    is_available: bool
    is_featured: bool
    tags: list[str]


class PublicMenuSectionRead(AppBaseModel):
    id: str
    name: str
    display_order: int
    items: list[PublicMenuItemRead]


class PublicTenantRead(AppBaseModel):
    id: str
    name: str
    slug: str
    hero_title: str | None = None
    hero_subtitle: str | None = None
    primary_color: str
    accent_color: str
    logo_url: str | None = None


class PublicMenuRead(AppBaseModel):
    tenant: PublicTenantRead
    menu_id: str
    menu_name: str
    ordering_enabled: bool
    sections: list[PublicMenuSectionRead]


class TableRead(AppBaseModel):
    id: str
    tenant_id: str
    table_number: str
    code: str


class PublicOrderItemCreate(BaseModel):
    menu_item_id: str
    quantity: int = Field(default=1, ge=1)


class PublicOrderCreate(BaseModel):
    guest_name: str
    notes: str | None = None
    items: list[PublicOrderItemCreate]


class PublicOrderItemRead(AppBaseModel):
    menu_item_id: str
    menu_item_name: str
    quantity: int
    price: Decimal


class PublicOrderStatusRead(AppBaseModel):
    order_id: str
    public_status_token: str
    table_number: str
    guest_name: str | None = None
    status: OrderStatus
    notes: str | None = None
    total_price: Decimal
    placed_at: datetime
    ready_at: datetime | None = None
    served_at: datetime | None = None
    items: list[PublicOrderItemRead]
