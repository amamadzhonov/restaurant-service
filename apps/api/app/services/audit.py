import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


async def record_audit(
    db: AsyncSession,
    *,
    tenant_id: str | None,
    actor_user_id: str | None,
    action: str,
    entity_name: str,
    entity_id: str | None,
    payload: dict[str, Any] | None = None,
) -> None:
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_user_id=actor_user_id,
            action=action,
            entity_name=entity_name,
            entity_id=entity_id,
            payload=json.dumps(payload, default=str) if payload else None,
        )
    )
    await db.flush()

