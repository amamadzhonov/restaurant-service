from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.security import create_token, verify_password
from app.models import User

settings = get_settings()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).options(selectinload(User.tenant)).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.password_hash) or not user.is_active:
        return None
    return user


def build_access_token(user: User) -> str:
    return create_token(
        subject=user.id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        extra={"role": user.role.value, "tenant_id": user.tenant_id},
    )


def build_refresh_token(user: User) -> str:
    return create_token(
        subject=user.id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        extra={"role": user.role.value, "tenant_id": user.tenant_id},
    )

