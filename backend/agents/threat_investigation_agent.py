import json
from typing import Dict, Any, List

from backend.services.llm_service import LLMService

class ThreatInvestigationAgent:
    def __init__(self):
        self.llm = LLMService()
        self.system_prompt = """
        You are an expert SOC Level 2/3 Threat Investigator.
        Your job is to receive L1 Log Analysis findings and event timelines, correlate them into an attack narrative, and provide response recommendations.
        Always return a valid JSON object with the following schema:
        {
            "threat_type": "string",
            "attack_stage": "string (e.g. Reconnaissance, Initial Access, Execution, Exfiltration)",
            "affected_assets": ["string"],
            "reasoning": "string (narrative of the attack)",
            "mitre_tactics": ["string (e.g. TA0006: Credential Access)"],
            "recommended_actions": ["string (specific commands or actions)"]
        }
        """
        
    async def investigate(self, log_analysis_findings: Dict, event_timeline: List[Dict]) -> Dict[str, Any]:
        prompt = f"Investigate these L1 findings and the event timeline:\n\nL1 Findings: {json.dumps(log_analysis_findings)}\n\nTimeline: {json.dumps(event_timeline, default=str)}"
        
        try:
            result = await self.llm.analyze(prompt, self.system_prompt, use_json=True)
            return json.loads(result)
        except Exception as e:
            print(f"Threat Investigation Agent error: {e}")
            return {
                "threat_type": "Unknown",
                "attack_stage": "Unknown",
                "affected_assets": [],
                "reasoning": "Investigation failed.",
                "mitre_tactics": [],
                "recommended_actions": []
            }
