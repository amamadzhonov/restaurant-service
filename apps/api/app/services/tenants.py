from __future__ import annotations

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models import Tenant


def tenant_now(tenant: Tenant, now: datetime | None = None) -> datetime:
    current = now or datetime.now(UTC)
    return current.astimezone(_tenant_zone(tenant))


def tenant_day_bounds_utc(tenant: Tenant, now: datetime | None = None) -> tuple[datetime, datetime]:
    local_now = tenant_now(tenant, now)
    start_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def _tenant_zone(tenant: Tenant) -> ZoneInfo:
    try:
        return ZoneInfo(tenant.timezone)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")
