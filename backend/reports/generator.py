from backend.schemas.incident import IncidentResponse
import json

class ReportGenerator:
    def __init__(self):
        pass
        
    def generate_markdown_report(self, incident: IncidentResponse) -> str:
        report = f"# Incident Report: {incident.incident_id}\n\n"
        report += f"**Title:** {incident.title}\n"
        report += f"**Status:** {incident.status} | **Severity:** {incident.severity} | **Risk Score:** {incident.risk_score}\n"
        report += f"**Detected At:** {incident.detected_at}\n\n"
        
        report += "## 1. Executive Summary\n"
        report += f"{incident.ai_summary or 'No AI summary available.'}\n\n"
        
        report += "## 2. Affected Assets & Indicators\n"
        report += f"- **Assets:** {', '.join(incident.affected_assets) if incident.affected_assets else 'None identified'}\n"
        report += f"- **Indicators (IOCs):** {', '.join(incident.source_indicators) if incident.source_indicators else 'None identified'}\n\n"
        
        report += "## 3. MITRE ATT&CK Mapping\n"
        if incident.mitre_mapping:
            for tactic in incident.mitre_mapping:
                report += f"- {tactic}\n"
        else:
            report += "No MITRE mapping available.\n"
        report += "\n"
        
        report += "## 4. Response Recommendations\n"
        if incident.response_recommendations:
            for rec in incident.response_recommendations:
                report += f"- {rec}\n"
        else:
            report += "No automated response recommendations available.\n"
            
        report += "\n## 5. Event Timeline Summary\n"
        report += f"Total Events Correlated: {len(incident.event_timeline)}\n"
        
        return report
