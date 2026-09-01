import uuid
from typing import List, Dict, Any
from datetime import datetime, timedelta

from backend.schemas.event import EventCreate
from backend.schemas.incident import IncidentCreate

class CorrelationEngine:
    def __init__(self, time_window_minutes=15):
        self.time_window = timedelta(minutes=time_window_minutes)
        self.active_incidents = {}  # In-memory for simplicity in demo
        
    def process_event(self, event: EventCreate, detections: List[Dict[str, Any]] = None) -> IncidentCreate:
        if not detections:
            return None
            
        # 1. Determine if this event matches an existing incident
        matched_incident = None
        for incident_id, incident in self.active_incidents.items():
            # Check time window
            if event.timestamp - incident['last_seen'] <= self.time_window:
                # Check entity overlap (src_ip, dst_ip)
                if event.src_ip and event.src_ip in incident['entities']:
                    matched_incident = incident
                    break
                if event.dst_ip and event.dst_ip in incident['entities']:
                    matched_incident = incident
                    break
                    
        # 2. Update existing or create new
        max_severity_val = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        event_severity_val = max_severity_val.get(event.severity, 1)
        
        if matched_incident:
            # Update
            matched_incident['events'].append(event.model_dump(mode='json'))
            matched_incident['detections'].extend(detections)
            matched_incident['last_seen'] = event.timestamp
            
            # Update the underlying Pydantic schema so main.py sees the length change
            matched_incident['incident'].event_timeline.append(event.model_dump(mode='json'))
            matched_incident['incident'].evidence.extend([d for d in detections if d not in matched_incident['incident'].evidence])
            
            # Escalate severity if needed
            current_sev_val = max_severity_val.get(matched_incident['incident'].severity, 1)
            if event_severity_val > current_sev_val:
                matched_incident['incident'].severity = event.severity
                
            return matched_incident['incident']
        else:
            # Create new incident
            threat_type = detections[0].get("threat_class", "Suspicious Activity")
            new_incident = IncidentCreate(
                incident_id=f"INC-{uuid.uuid4().hex[:8]}",
                title=f"Potential {threat_type} detected",
                threat_type=threat_type,
                status="new",
                severity=event.severity,
                risk_score=0,  # Will be updated by risk scorer
                affected_assets=[event.dst_ip] if event.dst_ip else [],
                source_indicators=[event.src_ip] if event.src_ip else [],
                event_timeline=[event.model_dump(mode='json')],
                evidence=detections
            )
            
            entities = set()
            if event.src_ip: entities.add(event.src_ip)
            if event.dst_ip: entities.add(event.dst_ip)
            
            self.active_incidents[new_incident.incident_id] = {
                "incident": new_incident,
                "events": [event.model_dump(mode='json')],
                "detections": detections,
                "first_seen": event.timestamp,
                "last_seen": event.timestamp,
                "entities": entities
            }
            return new_incident
