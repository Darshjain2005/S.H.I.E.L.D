from backend.schemas.incident import IncidentCreate

class RiskScorer:
    def __init__(self):
        self.severity_weights = {
            "low": 10,
            "medium": 25,
            "high": 50,
            "critical": 80
        }
        
    def calculate_risk(self, incident: IncidentCreate) -> int:
        score = 0
        
        # 1. Base score from incident severity
        score += self.severity_weights.get(incident.severity, 10)
        
        # 2. Rule engine match volume multiplier (Max +20)
        num_events = len(incident.event_timeline)
        if num_events > 100:
            score += 20
        elif num_events > 10:
            score += 10
        elif num_events > 1:
            score += 5
            
        # 3. Detection Confidence modifier (Max +10)
        avg_confidence = 0
        if incident.evidence:
            confidences = [d.get("confidence", 0) for d in incident.evidence if isinstance(d, dict)]
            if confidences:
                avg_confidence = sum(confidences) / len(confidences)
                if avg_confidence > 0.9:
                    score += 10
                elif avg_confidence > 0.7:
                    score += 5
                    
        # 4. Critical Asset or Privilege Escalation (Max +20)
        for ev in incident.event_timeline:
            if ev.get("event_type") == "privilege_escalation":
                score += 20
                break
            if ev.get("user") in ["root", "admin", "administrator"]:
                score += 10
                break
                
        # 5. Data Exfiltration (Max +20)
        for ev in incident.event_timeline:
            if ev.get("event_type") == "data_transfer":
                metadata = ev.get("metadata_", {}) or {}
                if metadata.get("bytes_sent", 0) > 100000000: # >100MB
                    score += 20
                    break
        
        # Clamp to 0-100
        return max(0, min(100, score))
