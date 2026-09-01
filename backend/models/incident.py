from sqlalchemy import Column, String, DateTime, Text, Integer, JSON, ForeignKey
from sqlalchemy import Uuid as UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum
from sqlalchemy import Enum as SQLEnum

from backend.core.db import Base

class IncidentStatus(str, enum.Enum):
    NEW = "new"
    INVESTIGATING = "investigating"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"

class IncidentSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SecurityIncident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(String, unique=True, nullable=False, index=True)
    
    title = Column(String, nullable=False)
    threat_type = Column(String, index=True)
    status = Column(SQLEnum(IncidentStatus), nullable=False, default=IncidentStatus.NEW)
    severity = Column(SQLEnum(IncidentSeverity), nullable=False, default=IncidentSeverity.MEDIUM)
    risk_score = Column(Integer, default=0)  # 0-100
    
    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    affected_assets = Column(JSON, default=list)
    source_indicators = Column(JSON, default=list)
    event_timeline = Column(JSON, default=list)
    evidence = Column(JSON, default=list)
    
    detection_results = Column(JSON, default=dict)
    agent_findings = Column(JSON, default=dict)
    mitre_mapping = Column(JSON, default=list)
    response_recommendations = Column(JSON, default=list)
    
    analyst_notes = Column(Text)
    ai_summary = Column(Text)
    
    def __repr__(self):
        return f"<SecurityIncident {self.incident_id} - {self.threat_type}>"
