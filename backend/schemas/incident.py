from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class IncidentBase(BaseModel):
    incident_id: str
    title: str
    threat_type: Optional[str] = None
    status: str = "new"
    severity: str = "medium"
    risk_score: int = 0
    affected_assets: List[Any] = []
    source_indicators: List[Any] = []
    event_timeline: List[Any] = []
    evidence: List[Any] = []
    detection_results: Dict[str, Any] = {}
    agent_findings: Dict[str, Any] = {}
    mitre_mapping: List[Any] = []
    response_recommendations: List[Any] = []
    analyst_notes: Optional[str] = None
    ai_summary: Optional[str] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    severity: Optional[str] = None
    risk_score: Optional[int] = None
    analyst_notes: Optional[str] = None
    ai_summary: Optional[str] = None

class IncidentResponse(IncidentBase):
    id: UUID
    detected_at: datetime
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
