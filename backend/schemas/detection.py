from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class DetectionBase(BaseModel):
    event_id: Optional[str] = None
    engine: str
    threat_class: str
    severity: str
    confidence: float
    evidence: Optional[str] = None
    category: Optional[str] = None

class DetectionCreate(DetectionBase):
    pass

class DetectionResponse(DetectionBase):
    id: UUID
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
