from dataclasses import dataclass
from datetime import UTC, datetime

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import decode_token
from app.db.session import get_db
from app.models import Tenant, User, UserRole
from app.services.billing import tenant_access_locked


@dataclass
class TenantContext:
    user: User
    tenant: Tenant


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
    access_token: str | None = Cookie(default=None),
) -> User:
    token = access_token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1)

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        payload = decode_token(token)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")

    result = await db.execute(
        select(User).options(selectinload(User.tenant)).where(User.id == payload["sub"], User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: UserRole):
    async def _role_guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return current_user

    return _role_guard


async def require_tenant_context(
    slug: str,
    db: AsyncSession,
    user: User,
    allow_super_admin: bool = True,
    allow_billing_only: bool = False,
) -> TenantContext:
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    if user.role == UserRole.SUPER_ADMIN and allow_super_admin:
        return TenantContext(user=user, tenant=tenant)

    if user.tenant_id != tenant.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access denied")

    if not tenant.is_accessible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access is suspended. Contact the platform administrator.",
        )

    if not allow_billing_only and tenant_access_locked(tenant, datetime.now(UTC)):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Subscription access locked. Update billing to restore protected restaurant access.",
        )

    return TenantContext(user=user, tenant=tenant)
