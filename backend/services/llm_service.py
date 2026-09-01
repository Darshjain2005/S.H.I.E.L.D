import os
import json
from typing import Dict, Any, List
import httpx

from backend.core.config import settings

class LLMService:
    def __init__(self):
        self.gemini_api_key = settings.GEMINI_API_KEY
        self.groq_api_key = settings.GROQ_API_KEY
        
    async def analyze(self, prompt: str, system_instruction: str = "", use_json: bool = True) -> str:
        # Prefer Gemini, fallback to Groq
        if self.gemini_api_key:
            return await self._call_gemini(prompt, system_instruction, use_json)
        elif self.groq_api_key:
            return await self._call_groq(prompt, system_instruction, use_json)
        else:
            return self._mock_response(prompt, use_json)
            
    async def _call_gemini(self, prompt: str, system_instruction: str, use_json: bool) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={self.gemini_api_key}"
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]}
        }
        
        if use_json:
            payload["generationConfig"] = {"responseMimeType": "application/json"}
            
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
            
    async def _call_groq(self, prompt: str, system_instruction: str, use_json: bool) -> str:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
        }
        
        if use_json:
            payload["response_format"] = {"type": "json_object"}
            
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
            
    def _mock_response(self, prompt: str, use_json: bool) -> str:
        if use_json:
            return json.dumps({
                "classification": "Suspicious Activity",
                "confidence": 0.85,
                "indicators": ["185.12.3.4", "10.0.0.5"],
                "evidence": ["Multiple failed logins detected", "Privilege escalation attempts"],
                "threat_type": "Brute Force / Credential Stuffing",
                "risk_score": 85,
                "affected_assets": ["10.0.0.5"],
                "reasoning": "Mock reasoning since no API keys are provided.",
                "recommended_actions": ["Isolate host 10.0.0.5", "Block IP 185.12.3.4"]
            })
        return "Mock response: No API keys configured."
