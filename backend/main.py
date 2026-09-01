from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session
import asyncio

from backend.core.db import get_db, engine, Base
from backend.core.config import settings

from backend.models.incident import SecurityIncident
from backend.schemas.incident import IncidentCreate, IncidentResponse
from backend.incidents.manager import IncidentManager
from backend.agents.orchestrator import AgentOrchestrator
from backend.risk.scorer import RiskScorer
from backend.correlation.engine import CorrelationEngine
from backend.ingestion.parser import LogParser
from backend.ingestion.replayer import LogReplayer

# Initialize DB tables (for demo purposes, normally use Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agentic SOC API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services for demo
correlation_engine = CorrelationEngine()
agent_orchestrator = AgentOrchestrator()
risk_scorer = RiskScorer()
replayer = LogReplayer(logs_dir="sample_logs")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/incidents", response_model=list[IncidentResponse])
def list_incidents(db: Session = Depends(get_db)):
    manager = IncidentManager(db)
    return manager.get_all_incidents()

@app.post("/api/simulation/start/{scenario}")
async def start_simulation(scenario: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    manager = IncidentManager(db)
    
    async def run_scenario():
        for event in replayer.stream_events(scenario, delay_ms=10):
            # 1. Dummy Detection
            mock_detection = [{
                "engine": "rule_engine",
                "threat_class": "Suspicious Activity",
                "severity": event.severity,
                "confidence": 0.9,
                "evidence": f"Matched pattern for {event.event_type}"
            }] if event.severity in ["medium", "high", "critical"] else None
            
            # 2. Correlation
            incident_schema = correlation_engine.process_event(event, mock_detection)
            
            if incident_schema and len(incident_schema.event_timeline) == 5: # Arbitrary trigger threshold
                # 3. Agent Investigation
                enriched_incident = await agent_orchestrator.run_investigation_pipeline(incident_schema)
                
                # 4. Risk Scoring
                enriched_incident.risk_score = risk_scorer.calculate_risk(enriched_incident)
                
                # 5. Save to DB
                manager.create_incident(enriched_incident)
                print(f"Incident {enriched_incident.incident_id} saved.")

    background_tasks.add_task(run_scenario)
    return {"status": f"Simulation {scenario} started"}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.1", port=8000, reload=True)
