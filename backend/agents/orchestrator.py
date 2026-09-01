from typing import Dict, Any, List
from backend.agents.log_analysis_agent import LogAnalysisAgent
from backend.agents.threat_investigation_agent import ThreatInvestigationAgent
from backend.schemas.incident import IncidentCreate

class AgentOrchestrator:
    def __init__(self):
        self.log_agent = LogAnalysisAgent()
        self.threat_agent = ThreatInvestigationAgent()
        
    async def run_investigation_pipeline(self, incident: IncidentCreate) -> IncidentCreate:
        """Runs the multi-agent pipeline on an incident and enriches it."""
        
        # 1. L1 Log Analysis
        l1_findings = await self.log_agent.analyze_events(
            events=incident.event_timeline,
            detections=incident.evidence
        )
        
        incident.agent_findings["log_analysis"] = l1_findings
        
        # Merge indicators
        new_indicators = set(incident.source_indicators)
        new_indicators.update(l1_findings.get("indicators", []))
        incident.source_indicators = list(new_indicators)
        
        # 2. L2/L3 Threat Investigation
        l2_findings = await self.threat_agent.investigate(
            log_analysis_findings=l1_findings,
            event_timeline=incident.event_timeline
        )
        
        incident.agent_findings["threat_investigation"] = l2_findings
        
        # Update incident fields
        incident.threat_type = l2_findings.get("threat_type", incident.threat_type)
        incident.ai_summary = l2_findings.get("reasoning", "")
        incident.mitre_mapping = l2_findings.get("mitre_tactics", [])
        incident.response_recommendations = l2_findings.get("recommended_actions", [])
        
        new_assets = set(incident.affected_assets)
        new_assets.update(l2_findings.get("affected_assets", []))
        incident.affected_assets = list(new_assets)
        
        # Escalate status if investigation complete
        if incident.status == "new":
            incident.status = "investigating"
            
        return incident
