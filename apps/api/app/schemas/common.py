from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AppBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(AppBaseModel):
    message: str


class AuditLogRead(AppBaseModel):
    id: str
    action: str
    entity_name: str
    entity_id: str | None = None
    payload: str | None = None
    created_at: datetime

