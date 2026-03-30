from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import stripe
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Subscription, SubscriptionEvent, SubscriptionStatus, Tenant

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY

GRACE_PERIOD_DAYS = 7


def tenant_access_locked(tenant: Tenant, now: datetime | None = None) -> bool:
    now = now or datetime.now(UTC)
    if tenant.subscription_status in {SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING}:
        return False
    if tenant.grace_ends_at and tenant.grace_ends_at >= now:
        return False
    return True


def tenant_operations_locked(tenant: Tenant, now: datetime | None = None) -> bool:
    return (not tenant.is_accessible) or tenant_access_locked(tenant, now)


@dataclass
class BillingSessionResult:
    url: str


async def get_or_create_subscription(db: AsyncSession, tenant: Tenant) -> Subscription:
    result = await db.execute(
        select(Subscription).where(Subscription.tenant_id == tenant.id).order_by(Subscription.created_at.desc())
    )
    subscription = result.scalars().first()
    if subscription:
        return subscription

    subscription = Subscription(
        tenant_id=tenant.id,
        plan=tenant.subscription_plan,
        status=tenant.subscription_status,
        start_date=datetime.now(UTC),
    )
    db.add(subscription)
    await db.flush()
    return subscription


async def create_checkout_session(
    tenant: Tenant,
    price_id: str,
    success_url: str,
    cancel_url: str,
) -> BillingSessionResult:
    if settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
        return BillingSessionResult(url=f"{success_url}?demoCheckout=1&tenant={tenant.slug}")

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=tenant.stripe_customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"tenant_id": tenant.id, "tenant_slug": tenant.slug},
    )
    return BillingSessionResult(url=session.url)


async def create_portal_session(tenant: Tenant, return_url: str) -> BillingSessionResult:
    if settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
        return BillingSessionResult(url=f"{return_url}?demoPortal=1&tenant={tenant.slug}")

    if not tenant.stripe_customer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stripe customer not configured")

    session = stripe.billing_portal.Session.create(customer=tenant.stripe_customer_id, return_url=return_url)
    return BillingSessionResult(url=session.url)


async def apply_subscription_state(
    db: AsyncSession,
    tenant: Tenant,
    stripe_status: str,
    *,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
) -> None:
    mapped_status = {
        "trialing": SubscriptionStatus.TRIALING,
        "active": SubscriptionStatus.ACTIVE,
        "past_due": SubscriptionStatus.GRACE,
        "canceled": SubscriptionStatus.CANCELED,
        "incomplete": SubscriptionStatus.INCOMPLETE,
        "incomplete_expired": SubscriptionStatus.CANCELED,
        "unpaid": SubscriptionStatus.GRACE,
    }.get(stripe_status, SubscriptionStatus.INCOMPLETE)

    tenant.subscription_status = mapped_status
    tenant.stripe_customer_id = stripe_customer_id or tenant.stripe_customer_id
    tenant.stripe_subscription_id = stripe_subscription_id or tenant.stripe_subscription_id
    if mapped_status in {SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING}:
        tenant.grace_ends_at = None
    else:
        tenant.grace_ends_at = datetime.now(UTC) + timedelta(days=GRACE_PERIOD_DAYS)

    subscription = await get_or_create_subscription(db, tenant)
    subscription.status = mapped_status
    subscription.plan = tenant.subscription_plan
    subscription.end_date = tenant.grace_ends_at


async def handle_stripe_webhook(
    db: AsyncSession,
    *,
    event_id: str,
    event_type: str,
    payload: dict,
) -> None:
    existing = await db.execute(select(SubscriptionEvent).where(SubscriptionEvent.stripe_event_id == event_id))
    if existing.scalar_one_or_none():
        return

    stripe_object = payload.get("data", {}).get("object", {})
    tenant_id = stripe_object.get("metadata", {}).get("tenant_id")

    event = SubscriptionEvent(
        tenant_id=tenant_id,
        stripe_event_id=event_id,
        event_type=event_type,
        payload=json.dumps(payload, default=str),
    )
    db.add(event)

    if not tenant_id:
        return

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if tenant is None:
        return

    if event_type in {"customer.subscription.created", "customer.subscription.updated"}:
        await apply_subscription_state(
            db,
            tenant,
            stripe_object.get("status", "incomplete"),
            stripe_customer_id=stripe_object.get("customer"),
            stripe_subscription_id=stripe_object.get("id"),
        )
    elif event_type == "customer.subscription.deleted":
        await apply_subscription_state(
            db,
            tenant,
            "canceled",
            stripe_customer_id=stripe_object.get("customer"),
            stripe_subscription_id=stripe_object.get("id"),
        )
    elif event_type == "invoice.payment_failed":
        await apply_subscription_state(db, tenant, "past_due")
    elif event_type == "invoice.paid":
        await apply_subscription_state(db, tenant, "active")
