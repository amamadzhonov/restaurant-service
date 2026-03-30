from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps.auth import get_current_user
from app.core.config import get_settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models import User
from app.schemas.auth import AuthSession, LoginRequest, TenantContext, UserRead
from app.schemas.common import MessageResponse
from app.services.auth import authenticate_user, build_access_token, build_refresh_token

router = APIRouter(prefix="/auth")
settings = get_settings()


def _session_payload(user: User) -> AuthSession:
    tenant = None
    if user.tenant:
        tenant = TenantContext(
            id=user.tenant.id,
            name=user.tenant.name,
            slug=user.tenant.slug,
            subscription_status=user.tenant.subscription_status.value,
            grace_ends_at=user.tenant.grace_ends_at,
            is_accessible=user.tenant.is_accessible,
        )
    return AuthSession(user=UserRead.model_validate(user), tenant=tenant)


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )


@router.post("/login", response_model=AuthSession)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)) -> AuthSession:
    user = await authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    _set_auth_cookies(response, build_access_token(user), build_refresh_token(user))
    return _session_payload(user)


@router.post("/refresh", response_model=AuthSession)
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
) -> AuthSession:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        payload = decode_token(refresh_token)
    except Exception as exc:  # pragma: no cover - defensive auth error handling
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(select(User).options(selectinload(User.tenant)).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    _set_auth_cookies(response, build_access_token(user), build_refresh_token(user))
    return _session_payload(user)


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response) -> MessageResponse:
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=AuthSession)
async def me(current_user: User = Depends(get_current_user)) -> AuthSession:
    return _session_payload(current_user)
