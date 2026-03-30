from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models import DeviceStatus, OrderSource, OrderStatus, SubscriptionStatus, UserRole

from .common import AppBaseModel


class PlatformUserRead(AppBaseModel):
    id: str
    tenant_id: str | None = None
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime


class PlatformDeviceRead(AppBaseModel):
    id: str
    tenant_id: str
    label: str
    platform: str
    status: DeviceStatus
    assigned_table_id: str | None = None
    last_seen_at: datetime | None = None


class PlatformOrderSnapshot(AppBaseModel):
    id: str
    table_id: str
    table_number: str
    guest_name: str | None = None
    status: OrderStatus
    source: OrderSource
    total_price: Decimal
    created_at: datetime
    status_changed_at: datetime


class PlatformRestaurantListRead(AppBaseModel):
    id: str
    name: str
    slug: str
    subscription_plan: str
    subscription_status: SubscriptionStatus
    grace_ends_at: datetime | None = None
    is_accessible: bool
    admin_count: int
    device_count: int
    today_open_orders: int
    today_closed_orders: int


class PlatformRestaurantDetailRead(AppBaseModel):
    id: str
    name: str
    slug: str
    address: str | None = None
    timezone: str
    currency: str
    subscription_plan: str
    subscription_status: SubscriptionStatus
    grace_ends_at: datetime | None = None
    is_accessible: bool
    admin_count: int
    device_count: int
    today_open_orders: int
    today_closed_orders: int
    ready_backlog: int
    active_tables: int
    users: list[PlatformUserRead]
    devices: list[PlatformDeviceRead]
    recent_orders: list[PlatformOrderSnapshot]


class TenantAccessUpdate(BaseModel):
    is_accessible: bool


class PasswordResetRequest(BaseModel):
    expires_in_hours: int = 24


class PasswordResetTokenRead(AppBaseModel):
    user_id: str
    token: str
    expires_at: datetime
