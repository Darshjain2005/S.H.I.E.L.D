from sqlalchemy import Column, String, DateTime, Text, Integer, JSON
from sqlalchemy import Uuid as UUID
import uuid
from datetime import datetime

from backend.core.db import Base

class NormalizedEvent(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(String, unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    source = Column(String, index=True)  # e.g., "linux_auth", "firewall"
    event_type = Column(String, index=True)  # e.g., "authentication", "network_connection"
    severity = Column(String)  # "low", "medium", "high", "critical"
    
    src_ip = Column(String, index=True)
    dst_ip = Column(String, index=True)
    src_port = Column(Integer)
    dst_port = Column(Integer)
    
    user = Column(String, index=True)
    hostname = Column(String, index=True)
    process = Column(String)
    
    message = Column(Text)
    raw_log = Column(Text)
    metadata_ = Column(JSON)  # additional extensible data
    
    def __repr__(self):
        return f"<NormalizedEvent {self.event_id} - {self.event_type}>"
