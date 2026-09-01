# 🛡️ Agentic SOC — Master Developer Guide

Welcome to the **Agentic AI Cybersecurity Assistant** (SIH26S01)! This guide is designed to help teammates understand **what** we built, **why** we made specific architectural decisions, and **how** to extend the platform.

---

## 1. Project Origins (The "Why")

Instead of building blindly from scratch, this project was intelligently synthesized by adapting the best, battle-tested components from four of our previous projects. This allowed us to focus on the advanced AI agentic workflows rather than reinventing the wheel.

* **CloudHelm:** Provided our enterprise-grade **FastAPI + SQLAlchemy + JWT** backend foundation. We stripped out the cloud-cost logic and kept the rock-solid architecture.
* **SentinelX:** Provided our heavy machine learning detection logic. The **YAML Rule Engine, Isolation Forest, and GraphSAGE GNN** were extracted and adapted to process security logs.
* **DiodeGuard:** Provided the **Multi-Engine Orchestrator** pattern and the beautiful **Cyberpunk React/Vite UI** (Tailwind + Recharts).
* **CyberShield AI:** Provided the blueprint for integrating **Groq/Gemini LLMs** and the conversational Security Copilot UI.

---

## 2. Core Architecture & Data Flow

The system operates as an autonomous **Tier-1 / Tier-2 Security Operations Center (SOC)**.

1. **Ingestion (`backend/ingestion/`)**: Raw logs (e.g., Linux auth logs, Firewall logs) are parsed into a standardized `NormalizedEvent` object.
2. **Detection Engines (`backend/detection/`)**: 
   * *Rule Engine*: Checks deterministic Sigma-inspired YAML rules (e.g., 5 failed logins).
   * *Isolation Forest*: Scikit-learn model catching statistical volume anomalies.
   * *GraphSAGE*: PyTorch Geometric model catching structural anomalies (e.g., lateral movement).
3. **Correlation (`backend/correlation/`)**: Groups related events within a 15-minute window sharing the same IP or Hostname into a `SecurityIncident`.
4. **Agentic Pipeline (`backend/agents/`)**: 
   * **L1 Log Analysis Agent**: Reviews the raw events and engine detections to extract Indicators of Compromise (IOCs).
   * **L2 Threat Investigation Agent**: Takes the L1 report, writes an attack narrative, maps it to MITRE ATT&CK tactics, and recommends response actions.
5. **Deterministic Risk Scorer (`backend/risk/`)**: Assigns a `0-100` score using hard math (event volume, severity, exfiltration bytes) rather than relying on LLMs. *Why? To prevent AI hallucination on critical severity scoring.*

---

## 3. Directory Structure Guide

### Backend (`/backend`)
* `api/` — FastAPI routers (endpoints for frontend to consume).
* `agents/` — The LLM orchestration logic. Edit `log_analysis_agent.py` or `threat_investigation_agent.py` to change the AI's prompts/behavior.
* `correlation/` — Logic that groups multiple events into a single incident.
* `detection/` — The 3 ML/Heuristic engines.
  * `rules/rules/` — **Add new YAML threat signatures here.**
* `models/` & `schemas/` — SQLAlchemy database tables and Pydantic validation schemas.
* `services/llm_service.py` — Wrappers for Google Gemini and Groq APIs.

### Frontend (`/frontend`)
* `src/components/` — Reusable UI like the Sidebar and Layout.
* `src/pages/Dashboard.tsx` — The main overview with KPI cards, Recharts, and simulation buttons.
* `src/pages/Incidents.tsx` — The incident management drawer.
* `src/index.css` — Contains all the custom Cyberpunk animations (scanlines, glowing text, brackets).

---

## 4. How to Use & Develop

### Running the Platform
You need two terminals.

**Terminal 1 (Backend):**
```powershell
cd d:\projects\agentic-soc\backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```powershell
cd d:\projects\agentic-soc\frontend
npm run dev
```

### Mock Mode vs. Real AI
If you do not have an API key configured, `llm_service.py` will automatically fall back to "Mock Mode" and return a fake JSON response. This is so the UI won't crash during frontend development. 
To enable real AI, create `backend/.env`:
```env
GEMINI_API_KEY=your_key_here
```

### Adding New Detection Rules
To add a new deterministic rule (e.g., detecting a specific port), create a new YAML file in `backend/detection/rules/rules/`:
```yaml
title: Custom Suspicious Port
id: rule-005
level: high
detection:
  selection:
    dst_port: 4444
  condition: selection
```

---

## 5. How to Demo this at the SIH Pitch

When presenting to the judges, follow this flow:
1. Show the **Dashboard** starting empty.
2. Explain that in a real environment, logs stream in via Kafka/Logstash, but for the demo, we have a simulation engine.
3. Click **"Start Brute Force Scenario"**.
4. Switch to the **Live Events** tab to show the raw logs streaming in (failed SSH logins).
5. Switch to the **Incidents** tab. Show how the Correlation engine grouped those 10 raw events into **ONE** incident.
6. Open the Incident Detail to show the **AI Agent's output**: point out the MITRE ATT&CK mapping, the extracted IOCs (Attacker IP), and the automated Risk Score.
7. Explain that the AI didn't just guess the risk; it was calculated deterministically based on the fact that a *Privilege Escalation* event followed the brute force attempt.
