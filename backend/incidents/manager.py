from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from backend.models.incident import SecurityIncident, IncidentStatus, IncidentSeverity
from backend.schemas.incident import IncidentCreate, IncidentUpdate

class IncidentManager:
    def __init__(self, db: Session):
        self.db = db
        
    def create_incident(self, incident_create: IncidentCreate) -> SecurityIncident:
        db_incident = SecurityIncident(
            incident_id=incident_create.incident_id,
            title=incident_create.title,
            threat_type=incident_create.threat_type,
            status=IncidentStatus(incident_create.status.lower()),
            severity=IncidentSeverity(incident_create.severity.lower()),
            risk_score=incident_create.risk_score,
            affected_assets=incident_create.affected_assets,
            source_indicators=incident_create.source_indicators,
            event_timeline=incident_create.event_timeline,
            evidence=incident_create.evidence,
            detection_results=incident_create.detection_results,
            agent_findings=incident_create.agent_findings,
            mitre_mapping=incident_create.mitre_mapping,
            response_recommendations=incident_create.response_recommendations,
            analyst_notes=incident_create.analyst_notes,
            ai_summary=incident_create.ai_summary
        )
        self.db.add(db_incident)
        self.db.commit()
        self.db.refresh(db_incident)
        return db_incident
        
    def get_incident(self, incident_id: str) -> Optional[SecurityIncident]:
        return self.db.query(SecurityIncident).filter(SecurityIncident.incident_id == incident_id).first()
        
    def get_all_incidents(self, limit: int = 100) -> List[SecurityIncident]:
        return self.db.query(SecurityIncident).order_by(SecurityIncident.detected_at.desc()).limit(limit).all()
        
    def update_incident(self, incident_id: str, update_data: IncidentUpdate) -> Optional[SecurityIncident]:
        db_incident = self.get_incident(incident_id)
        if not db_incident:
            return None
            
        update_dict = update_data.model_dump(exclude_unset=True)
        if 'status' in update_dict:
            update_dict['status'] = IncidentStatus(update_dict['status'].lower())
        if 'severity' in update_dict:
            update_dict['severity'] = IncidentSeverity(update_dict['severity'].lower())
            
        for key, value in update_dict.items():
            setattr(db_incident, key, value)
            
        self.db.commit()
        self.db.refresh(db_incident)
        return db_incident
