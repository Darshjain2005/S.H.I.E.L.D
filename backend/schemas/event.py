from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class EventBase(BaseModel):
    event_id: str
    timestamp: datetime
    source: Optional[str] = None
    event_type: Optional[str] = None
    severity: Optional[str] = None
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    user: Optional[str] = None
    hostname: Optional[str] = None
    process: Optional[str] = None
    message: Optional[str] = None
    raw_log: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)
