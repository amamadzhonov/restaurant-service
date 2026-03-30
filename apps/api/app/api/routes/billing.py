import json

import stripe
from fastapi import APIRouter, Depends, Header, Request, status
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_roles, require_tenant_context
from app.core.config import get_settings
from app.db.session import get_db
from app.models import User, UserRole
from app.schemas.admin import SubscriptionRead
from app.schemas.billing import CheckoutSessionRequest, PortalSessionRequest, StripeSessionResponse
from app.services.billing import create_checkout_session, create_portal_session, get_or_create_subscription, handle_stripe_webhook

router = APIRouter()
settings = get_settings()


@router.get(
    "/admin/{slug}/billing/subscription",
    response_model=SubscriptionRead,
)
async def get_subscription(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> SubscriptionRead:
    ctx = await require_tenant_context(slug, db, current_user, allow_billing_only=True)
    subscription = await get_or_create_subscription(db, ctx.tenant)
    await db.commit()
    return SubscriptionRead(
        tenant_id=ctx.tenant.id,
        plan=subscription.plan,
        status=subscription.status,
        grace_ends_at=ctx.tenant.grace_ends_at,
        stripe_customer_id=ctx.tenant.stripe_customer_id,
        stripe_subscription_id=ctx.tenant.stripe_subscription_id,
        is_accessible=ctx.tenant.is_accessible,
    )


@router.post(
    "/admin/{slug}/billing/checkout-session",
    response_model=StripeSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_billing_checkout_session(
    slug: str,
    payload: CheckoutSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> StripeSessionResponse:
    ctx = await require_tenant_context(slug, db, current_user, allow_billing_only=True)
    session = await create_checkout_session(ctx.tenant, payload.price_id, payload.success_url, payload.cancel_url)
    return StripeSessionResponse(url=session.url)


@router.post(
    "/admin/{slug}/billing/portal-session",
    response_model=StripeSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_billing_portal_session(
    slug: str,
    payload: PortalSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> StripeSessionResponse:
    ctx = await require_tenant_context(slug, db, current_user, allow_billing_only=True)
    session = await create_portal_session(ctx.tenant, payload.return_url)
    return StripeSessionResponse(url=session.url)


@router.post("/webhooks/stripe", status_code=status.HTTP_202_ACCEPTED)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
) -> dict[str, str]:
    body = await request.body()
    payload = json.loads(body.decode("utf-8"))

    if not settings.STRIPE_WEBHOOK_SECRET.startswith("whsec_placeholder") and stripe_signature:
        try:
            event = stripe.Webhook.construct_event(body, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
            payload = event
        except Exception as exc:  # pragma: no cover - depends on third-party verification
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature") from exc

    event_id = payload.get("id")
    event_type = payload.get("type")
    if not event_id or not event_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload")

    await handle_stripe_webhook(db, event_id=event_id, event_type=event_type, payload=payload)
    await db.commit()
    return {"status": "accepted"}
