from datetime import datetime

from pydantic import BaseModel

from app.models import UserRole

from .common import AppBaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class TenantContext(AppBaseModel):
    id: str | None = None
    name: str | None = None
    slug: str | None = None
    subscription_status: str | None = None
    grace_ends_at: datetime | None = None
    is_accessible: bool | None = None


class UserRead(AppBaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    tenant_id: str | None = None
    is_active: bool
    created_at: datetime


class AuthSession(AppBaseModel):
    user: UserRead
    tenant: TenantContext | None = None
