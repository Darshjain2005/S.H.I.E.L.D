import json
from typing import Dict, Any, List

from backend.services.llm_service import LLMService
from backend.schemas.event import EventCreate

class LogAnalysisAgent:
    def __init__(self):
        self.llm = LLMService()
        self.system_prompt = """
        You are an expert SOC Level 1 Analyst.
        Your job is to analyze normalized security events and rule engine detections, and extract key indicators of compromise.
        Always return a valid JSON object with the following schema:
        {
            "classification": "string (e.g. Brute Force, Normal, Port Scan)",
            "confidence": "float 0-1",
            "indicators": ["string (IPs, users, etc.)"],
            "evidence": ["string (why you think this is malicious)"]
        }
        """
        
    async def analyze_events(self, events: List[Dict], detections: List[Dict]) -> Dict[str, Any]:
        prompt = f"Analyze the following events and rule detections:\n\nEvents: {json.dumps(events, default=str)}\n\nDetections: {json.dumps(detections, default=str)}"
        
        try:
            result = await self.llm.analyze(prompt, self.system_prompt, use_json=True)
            return json.loads(result)
        except Exception as e:
            print(f"Log Analysis Agent error: {e}")
            return {"classification": "Unknown", "confidence": 0.0, "indicators": [], "evidence": []}
