import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session
import threading
import time
import traceback

from backend.core.db import get_db, engine, Base, SessionLocal
from backend.core.config import settings

from backend.models.incident import SecurityIncident
from backend.models.event import NormalizedEvent
from backend.schemas.incident import IncidentCreate, IncidentResponse
from backend.schemas.event import EventResponse
from backend.incidents.manager import IncidentManager
from backend.agents.orchestrator import AgentOrchestrator
from backend.risk.scorer import RiskScorer
from backend.correlation.engine import CorrelationEngine
from backend.ingestion.replayer import LogReplayer
from backend.detection.rules.rule_engine import RuleEngine
from backend.api.assistant import router as assistant_router

# Initialize DB tables (for demo purposes)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agentic SOC API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistant_router)

correlation_engine = CorrelationEngine()
risk_scorer = RiskScorer()
replayer = LogReplayer(logs_dir=os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_logs"))
rule_engine = RuleEngine(rules_dir=os.path.join(os.path.dirname(__file__), "detection", "rules", "rules"))

simulation_running = threading.Event()
simulation_status = {"running": False, "scenario": None, "events_processed": 0, "incidents_created": 0}
simulation_thread = None

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/events")
def list_events(db: Session = Depends(get_db)):
    events = db.query(NormalizedEvent).order_by(NormalizedEvent.timestamp.desc()).limit(100).all()
    return events

@app.get("/api/incidents", response_model=list[IncidentResponse])
def list_incidents(db: Session = Depends(get_db)):
    manager = IncidentManager(db)
    return manager.get_all_incidents()

@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    manager = IncidentManager(db)
    incident = manager.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@app.patch("/api/incidents/{incident_id}")
def update_incident(incident_id: str, updates: dict, db: Session = Depends(get_db)):
    manager = IncidentManager(db)
    incident = manager.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if "status" in updates:
        incident.status = updates["status"]
    if "notes" in updates:
        incident.notes = updates["notes"]
    db.commit()
    return {"status": "updated"}

@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    manager = IncidentManager(db)
    incidents = manager.get_all_incidents()
    total_events = db.query(NormalizedEvent).count()
    active_incidents = sum(1 for i in incidents if i.status not in ("closed", "resolved", "false_positive"))
    
    # Calculate detections count
    detections_count = sum(len(i.evidence) if i.evidence else 0 for i in incidents)
    
    return {
        "total_events": total_events,
        "active_incidents": active_incidents,
        "detections_count": detections_count,
        "risk_summary": {
            "high": sum(1 for i in incidents if i.risk_score and i.risk_score >= 80),
            "medium": sum(1 for i in incidents if i.risk_score and 40 <= i.risk_score < 80),
            "low": sum(1 for i in incidents if i.risk_score is not None and i.risk_score < 40)
        }
    }


def _run_simulation_thread(scenario: str):
    """
    Runs the simulation in a separate thread with its own DB session.
    This avoids the async event loop blocking and session closure issues.
    """
    import asyncio
    
    # Create a fresh DB session for this thread
    db = SessionLocal()
    manager = IncidentManager(db)
    
    # Reset correlation engine for fresh simulation
    correlation_engine.active_incidents.clear()
    
    # Track which incidents we've already saved (by incident_id)
    saved_incident_ids = set()
    events_processed = 0
    incidents_created = 0
    
    try:
        print(f"[SIM] Starting scenario: {scenario}")
        events = replayer.get_scenario_events(scenario)
        print(f"[SIM] Loaded {len(events)} events from scenario '{scenario}'")
        
        if not events:
            print(f"[SIM] WARNING: No events found for scenario '{scenario}'!")
            print(f"[SIM] Looking in: {replayer.logs_dir / scenario / 'scenario.jsonl'}")
            return
        
        for event in events:
            if not simulation_running.is_set():
                print("[SIM] Simulation stopped by user.")
                break
            
            # 1. Save event to DB
            try:
                db_event = NormalizedEvent(**event.model_dump(exclude_none=True))
                db.add(db_event)
                db.commit()
                events_processed += 1
                simulation_status["events_processed"] = events_processed
            except Exception as e:
                db.rollback()
                print(f"[SIM] Error saving event: {e}")
                continue
            
            # 2. Rule Engine Detection
            triggered_rules = rule_engine.evaluate_flow(event)
            
            detections = []
            if triggered_rules:
                for rule_title in triggered_rules:
                    detections.append({
                        "engine": "rule_engine",
                        "threat_class": rule_title,
                        "severity": event.severity or "medium",
                        "confidence": 0.9,
                        "evidence": f"Matched pattern for {rule_title}"
                    })
                print(f"[SIM] Event {events_processed}: Rules triggered: {triggered_rules}")
            else:
                detections = None
            
            # 3. Correlation
            incident_schema = correlation_engine.process_event(event, detections)
            
            if incident_schema:
                timeline_len = len(incident_schema.event_timeline)
                print(f"[SIM] Incident {incident_schema.incident_id} timeline: {timeline_len} events")
                
                if timeline_len >= 3 and incident_schema.incident_id not in saved_incident_ids:
                    print(f"[SIM] Incident {incident_schema.incident_id} reached threshold, running agent pipeline...")
                    
                    # 4. Agent Investigation (run async in a new event loop)
                    try:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        agent_orchestrator = AgentOrchestrator()
                        enriched_incident = loop.run_until_complete(
                            agent_orchestrator.run_investigation_pipeline(incident_schema)
                        )
                        loop.close()
                    except Exception as e:
                        print(f"[SIM] Agent pipeline error (using fallback): {e}")
                        enriched_incident = incident_schema
                        enriched_incident.ai_summary = f"Auto-detected {incident_schema.threat_type}. Agent analysis unavailable."
                    
                    # 5. Risk Scoring
                    enriched_incident.risk_score = risk_scorer.calculate_risk(enriched_incident)
                    print(f"[SIM] Risk score: {enriched_incident.risk_score}")
                    
                    # 6. Save Incident to DB
                    try:
                        manager.create_incident(enriched_incident)
                        saved_incident_ids.add(enriched_incident.incident_id)
                        incidents_created += 1
                        simulation_status["incidents_created"] = incidents_created
                        print(f"[SIM] Incident {enriched_incident.incident_id} SAVED to DB (risk={enriched_incident.risk_score})")
                    except Exception as e:
                        db.rollback()
                        print(f"[SIM] Error saving incident: {e}")
                        traceback.print_exc()
            
            # Small delay between events
            time.sleep(0.5)
        
        print(f"[SIM] Simulation complete. Events: {events_processed}, Incidents: {incidents_created}")
        
    except Exception as e:
        print(f"[SIM] Simulation error: {e}")
        traceback.print_exc()
    finally:
        db.close()
        simulation_running.clear()
        simulation_status["running"] = False
        simulation_status["scenario"] = None


@app.post("/api/simulation/start/{scenario}")
def start_simulation(scenario: str):
    global simulation_thread
    
    if simulation_running.is_set():
        raise HTTPException(status_code=400, detail="Simulation already running")
    
    simulation_running.set()
    simulation_status["running"] = True
    simulation_status["scenario"] = scenario
    simulation_status["events_processed"] = 0
    simulation_status["incidents_created"] = 0
    
    # Use a daemon thread (like DiodeGuard does) instead of BackgroundTasks
    simulation_thread = threading.Thread(target=_run_simulation_thread, args=(scenario,), daemon=True)
    simulation_thread.start()
    
    return {"status": f"Simulation '{scenario}' started"}

@app.post("/api/simulation/stop")
def stop_simulation():
    simulation_running.clear()
    return {"status": "Stopping simulation..."}

@app.get("/api/simulation/status")
def get_simulation_status():
    return simulation_status

@app.get("/api/incidents/{incident_id}/report")
def get_incident_report(incident_id: str, db: Session = Depends(get_db)):
    manager = IncidentManager(db)
    incident = manager.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    report = f"# Incident Report: {incident.title}\n\n"
    report += f"**Incident ID:** {incident.incident_id}\n"
    report += f"**Risk Score:** {incident.risk_score}\n"
    report += f"**Status:** {incident.status}\n"
    report += f"**Severity:** {incident.severity}\n"
    report += f"**Threat Type:** {incident.threat_type}\n\n"
    
    report += f"## AI Summary\n{incident.ai_summary or 'N/A'}\n\n"
    
    report += f"## Affected Assets\n"
    if incident.affected_assets:
        for asset in incident.affected_assets:
            report += f"- {asset}\n"
    
    report += f"\n## Evidence Timeline\n"
    if incident.evidence:
        for i, ev in enumerate(incident.evidence[:10], 1):
            if isinstance(ev, dict):
                report += f"- [{ev.get('engine', 'N/A')}] {ev.get('threat_class', 'N/A')} (confidence: {ev.get('confidence', 'N/A')})\n"
            else:
                report += f"- {ev}\n"
    
    report += f"\n## Response Recommendations\n"
    if incident.response_recommendations:
        for rec in incident.response_recommendations:
            report += f"- {rec}\n"
            
    return {"report": report}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
