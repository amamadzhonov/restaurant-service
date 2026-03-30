from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models import DeviceStatus, OrderSource, OrderStatus, SubscriptionStatus, UserRole

from .common import AppBaseModel

ALLOWED_MENU_TAGS = {"vegetarian", "vegan", "halal", "spicy", "gluten_free"}
MANAGED_STAFF_ROLES = {UserRole.ADMIN, UserRole.WAITER, UserRole.KITCHEN}


class MenuCreate(BaseModel):
    name: str
    is_active: bool = True


class MenuRead(AppBaseModel):
    id: str
    tenant_id: str
    name: str
    is_active: bool
    created_at: datetime


class MenuSectionCreate(BaseModel):
    menu_id: str
    name: str
    display_order: int = 0


class MenuSectionUpdate(BaseModel):
    name: str | None = None
    display_order: int | None = None


class MenuSectionRead(AppBaseModel):
    id: str
    tenant_id: str
    menu_id: str
    name: str
    display_order: int
    created_at: datetime


class MenuItemCreate(BaseModel):
    menu_id: str
    section_id: str
    name: str
    description: str | None = None
    price: Decimal
    image_url: str | None = None
    is_available: bool = True
    is_featured: bool = False
    tags: list[str] = Field(default_factory=list)
    display_order: int = 0


class MenuItemUpdate(BaseModel):
    menu_id: str | None = None
    section_id: str | None = None
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    image_url: str | None = None
    is_available: bool | None = None
    is_featured: bool | None = None
    tags: list[str] | None = None
    display_order: int | None = None


class MenuItemRead(AppBaseModel):
    id: str
    tenant_id: str
    menu_id: str
    section_id: str
    name: str
    description: str | None = None
    price: Decimal
    image_url: str | None = None
    is_available: bool
    is_featured: bool
    tags: list[str]
    display_order: int
    created_at: datetime


class TableCreate(BaseModel):
    table_number: str
    qr_code_url: str | None = None


class TableUpdate(BaseModel):
    table_number: str | None = None
    qr_code_url: str | None = None
    current_waiter_user_id: str | None = None


class TableAdminRead(AppBaseModel):
    id: str
    tenant_id: str
    table_number: str
    code: str
    qr_code_url: str | None = None
    current_waiter_user_id: str | None = None
    current_waiter_name: str | None = None
    claimed_at: datetime | None = None


class DeviceCreate(BaseModel):
    label: str
    platform: str = "web"
    status: DeviceStatus = DeviceStatus.ACTIVE
    assigned_table_id: str | None = None


class DeviceUpdate(BaseModel):
    label: str | None = None
    platform: str | None = None
    status: DeviceStatus | None = None
    assigned_table_id: str | None = None


class DeviceRead(AppBaseModel):
    id: str
    tenant_id: str
    label: str
    platform: str
    status: DeviceStatus
    assigned_table_id: str | None = None
    last_seen_at: datetime | None = None


class OrderItemRead(AppBaseModel):
    id: str
    menu_item_id: str
    menu_item_name: str
    quantity: int
    price: Decimal


class OrderRead(AppBaseModel):
    id: str
    tenant_id: str
    table_id: str
    table_number: str
    created_by_user_id: str | None = None
    served_by_user_id: str | None = None
    closed_by_user_id: str | None = None
    source: OrderSource
    guest_name: str | None = None
    public_status_token: str
    status: OrderStatus
    total_price: Decimal
    notes: str | None = None
    placed_at: datetime
    ready_at: datetime | None = None
    served_at: datetime | None = None
    closed_at: datetime | None = None
    created_at: datetime
    status_changed_at: datetime
    items: list[OrderItemRead]


class StaffAccountCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: UserRole
    is_active: bool = True


class StaffAccountUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    password: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class StaffAccountRead(AppBaseModel):
    id: str
    tenant_id: str
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime


class AdminOperationsSummary(AppBaseModel):
    orders_today: int
    ready_backlog: int
    active_orders: int
    closed_today: int
    gross_sales_today: Decimal
    active_tables: int


class SubscriptionRead(AppBaseModel):
    tenant_id: str
    plan: str
    status: SubscriptionStatus
    grace_ends_at: datetime | None = None
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    is_accessible: bool
