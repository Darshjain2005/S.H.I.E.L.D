from sqlalchemy import Column, String, DateTime, Text, Integer, Float, JSON, ForeignKey
from sqlalchemy import Uuid as UUID
import uuid
from datetime import datetime

from backend.core.db import Base

class Detection(Base):
    __tablename__ = "detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(String, index=True) # References NormalizedEvent.event_id loosely
    
    engine = Column(String, index=True)  # "rule_engine", "isolation_forest", "graphsage"
    threat_class = Column(String)
    severity = Column(String)
    confidence = Column(Float)
    
    evidence = Column(Text)
    category = Column(String)
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<Detection {self.engine} - {self.threat_class}>"
