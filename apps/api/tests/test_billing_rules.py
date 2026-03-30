from datetime import UTC, datetime, timedelta

from app.models import SubscriptionStatus, Tenant
from app.services.billing import tenant_access_locked, tenant_operations_locked


def build_tenant(
    status: SubscriptionStatus,
    grace_ends_at: datetime | None = None,
    *,
    is_accessible: bool = True,
) -> Tenant:
    return Tenant(
        name="Harbor Bistro",
        slug=f"harbor-{status.value}",
        subscription_status=status,
        grace_ends_at=grace_ends_at,
        is_accessible=is_accessible,
    )


def test_active_tenant_is_not_locked() -> None:
    tenant = build_tenant(SubscriptionStatus.ACTIVE)
    assert tenant_access_locked(tenant, datetime.now(UTC)) is False


def test_grace_period_prevents_lock() -> None:
    tenant = build_tenant(SubscriptionStatus.GRACE, datetime.now(UTC) + timedelta(days=3))
    assert tenant_access_locked(tenant, datetime.now(UTC)) is False


def test_expired_grace_locks_tenant() -> None:
    tenant = build_tenant(SubscriptionStatus.GRACE, datetime.now(UTC) - timedelta(days=1))
    assert tenant_access_locked(tenant, datetime.now(UTC)) is True


def test_manual_access_suspend_locks_operations() -> None:
    tenant = build_tenant(SubscriptionStatus.ACTIVE, is_accessible=False)
    assert tenant_access_locked(tenant, datetime.now(UTC)) is False
    assert tenant_operations_locked(tenant, datetime.now(UTC)) is True
