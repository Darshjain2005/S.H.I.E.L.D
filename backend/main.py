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
    import datetime
    from collections import defaultdict
    
    manager = IncidentManager(db)
    incidents = manager.get_all_incidents()
    total_events = db.query(NormalizedEvent).count()
    active_incidents = sum(1 for i in incidents if i.status not in ("closed", "resolved", "false_positive"))
    
    # Calculate detections count
    detections_count = sum(len(i.evidence) if i.evidence else 0 for i in incidents)
    
    # Generate Real Timeline Data
    timeline_dict = defaultdict(lambda: {"events": 0, "alerts": 0})
    
    # Bucket incidents by minute
    for inc in incidents:
        if inc.detected_at:
            dt = datetime.datetime.fromisoformat(inc.detected_at.replace('Z', '+00:00')) if isinstance(inc.detected_at, str) else inc.detected_at
            if dt:
                bucket = dt.strftime("%H:%M")
                timeline_dict[bucket]["alerts"] += 1
                
    # Bucket recent events (limit 500 for performance) by minute
    recent_events = db.query(NormalizedEvent).order_by(NormalizedEvent.timestamp.desc()).limit(500).all()
    for ev in recent_events:
        if ev.timestamp:
            dt = datetime.datetime.fromisoformat(ev.timestamp.replace('Z', '+00:00')) if isinstance(ev.timestamp, str) else ev.timestamp
            if dt:
                bucket = dt.strftime("%H:%M")
                timeline_dict[bucket]["events"] += 1
                
    timeline = [{"time": k, "events": v["events"], "alerts": v["alerts"]} for k, v in sorted(timeline_dict.items())]
    if not timeline:
        now = datetime.datetime.now()
        timeline = [{"time": now.strftime("%H:%M"), "events": 0, "alerts": 0}]
    
    return {
        "total_events": total_events,
        "active_incidents": active_incidents,
        "detections_count": detections_count,
        "risk_summary": {
            "high": sum(1 for i in incidents if i.risk_score and i.risk_score >= 80),
            "medium": sum(1 for i in incidents if i.risk_score and 40 <= i.risk_score < 80),
            "low": sum(1 for i in incidents if i.risk_score is not None and i.risk_score < 40)
        },
        "timeline": timeline
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
        
        if scenario == "cic_ids2017":
            from backend.cic_ids_runner import CICIDSRunner
            dataset_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'DiodeGuard', 'datasets', 'combinenew.csv'))
            runner = CICIDSRunner(dataset_path)
            runner.setup_ml()
            event_stream = runner.stream_and_detect(start_idx=2000, count=500)
            
            for event, detections in event_stream:
                if not simulation_running.is_set():
                    break
                
                # Save event
                try:
                    db_event = NormalizedEvent(**event.model_dump(exclude_none=True))
                    db.add(db_event)
                    db.commit()
                    events_processed += 1
                    simulation_status["events_processed"] = events_processed
                except Exception as e:
                    db.rollback()
                    continue
                    
                incident_schema = correlation_engine.process_event(event, detections)
                
                if incident_schema:
                    timeline_len = len(incident_schema.event_timeline)
                    
                    if timeline_len >= 3 and incident_schema.incident_id not in saved_incident_ids:
                        print(f"[SIM] Incident {incident_schema.incident_id} reached threshold, running agent pipeline...")
                        try:
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                            agent_orchestrator = AgentOrchestrator()
                            enriched_incident = loop.run_until_complete(
                                agent_orchestrator.run_investigation_pipeline(incident_schema)
                            )
                            loop.close()
                        except Exception as e:
                            enriched_incident = incident_schema
                            enriched_incident.ai_summary = f"Auto-detected {incident_schema.threat_type}. Agent analysis unavailable."
                        
                        enriched_incident.risk_score = risk_scorer.calculate_risk(enriched_incident)
                        
                        try:
                            manager.create_incident(enriched_incident)
                            saved_incident_ids.add(enriched_incident.incident_id)
                            incidents_created += 1
                            simulation_status["incidents_created"] = incidents_created
                            print(f"[SIM] Incident {enriched_incident.incident_id} SAVED to DB (risk={enriched_incident.risk_score})")
                        except Exception as e:
                            db.rollback()
                time.sleep(0.1)
                
        else:
            events = replayer.get_scenario_events(scenario)
            print(f"[SIM] Loaded {len(events)} events from scenario '{scenario}'")
            
            if not events:
                print(f"[SIM] WARNING: No events found for scenario '{scenario}'!")
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
                            "engine": "Rule Engine",
                            "threat_class": rule_title,
                            "severity": event.severity or "medium",
                            "confidence": 0.95,
                            "evidence": f"Matched rule signature: {rule_title}"
                        })
                    
                    # Simulate multi-engine DiodeGuard detections
                    if scenario == "brute_force":
                        detections.append({
                            "engine": "Isolation Forest",
                            "threat_class": "UNKNOWN_ANOMALY",
                            "severity": "medium",
                            "confidence": 0.88,
                            "evidence": "Statistical deviation in authentication attempts"
                        })
                    elif scenario == "data_exfiltration":
                        detections.append({
                            "engine": "GraphSAGE",
                            "threat_class": "STRUCTURAL_ANOMALY",
                            "severity": "critical",
                            "confidence": 0.94,
                            "evidence": "Anomalous external transfer graph structure"
                        })
                    elif scenario == "reconnaissance":
                        detections.append({
                            "engine": "Isolation Forest",
                            "threat_class": "SCAN_ANOMALY",
                            "severity": "high",
                            "confidence": 0.91,
                            "evidence": "Unusual connection frequency to multiple ports"
                        })
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
    from fpdf import FPDF
    from fastapi.responses import Response
    import textwrap
    import re
    
    manager = IncidentManager(db)
    incident = manager.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    def sanitize(text):
        if not text:
            return ""
        text = str(text)
        replacements = {
            '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
            '\u2013': '-', '\u2014': '-', '\u2026': '...', '\u2022': '-'
        }
        for k, v in replacements.items():
            text = text.replace(k, v)
        text = text.encode('latin-1', 'replace').decode('latin-1')
        return textwrap.fill(text, width=95, break_long_words=True, replace_whitespace=False)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, "ADNEXUS - Incident Report", ln=True, align="C")
    pdf.ln(4)
    
    # Incident ID & Meta
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"Incident: {incident.incident_id}", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6, sanitize(f"Title: {incident.title}"))
    pdf.multi_cell(0, 6, sanitize(f"Severity: {incident.severity}  |  Risk Score: {incident.risk_score}/100  |  Status: {incident.status}"))
    pdf.multi_cell(0, 6, sanitize(f"Threat Type: {incident.threat_type}"))
    pdf.multi_cell(0, 6, sanitize(f"Detected At: {incident.detected_at}"))
    pdf.ln(6)
    
    # AI Summary
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "AI Investigation Summary", ln=True)
    pdf.set_font("Helvetica", "", 10)
    summary = incident.ai_summary or "No AI summary available."
    for line in str(summary).split('\n'):
        if line.strip():
            pdf.multi_cell(0, 6, sanitize(line.strip()))
    pdf.ln(4)
    
    # Affected Assets
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Affected Assets", ln=True)
    pdf.set_font("Helvetica", "", 10)
    if incident.affected_assets:
        for asset in incident.affected_assets:
            pdf.multi_cell(0, 6, sanitize(f"  - {asset}"))
    else:
        pdf.cell(0, 6, "  None identified", ln=True)
    pdf.ln(4)
    
    # MITRE ATT&CK
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "MITRE ATT&CK Mapping", ln=True)
    pdf.set_font("Helvetica", "", 10)
    if incident.mitre_mapping:
        for tactic in incident.mitre_mapping:
            pdf.multi_cell(0, 6, sanitize(f"  - {tactic}"))
    else:
        pdf.cell(0, 6, "  No MITRE mapping available", ln=True)
    pdf.ln(4)
    
    # Detection Evidence
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Detection Evidence", ln=True)
    pdf.set_font("Helvetica", "", 10)
    if incident.evidence:
        for i, ev in enumerate(incident.evidence[:15], 1):
            if isinstance(ev, dict):
                line = f"  {i}. [{ev.get('engine', 'N/A')}] {ev.get('threat_class', 'N/A')} (conf: {ev.get('confidence', 'N/A')})"
            else:
                line = f"  {i}. {ev}"
            pdf.multi_cell(0, 6, sanitize(line))
    else:
        pdf.cell(0, 6, "  No evidence recorded", ln=True)
    pdf.ln(4)
    
    # Response Recommendations
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Response Recommendations", ln=True)
    pdf.set_font("Helvetica", "", 10)
    if incident.response_recommendations:
        for rec in incident.response_recommendations:
            pdf.multi_cell(0, 6, sanitize(f"  - {rec}"))
    else:
        pdf.cell(0, 6, "  No recommendations available", ln=True)
    pdf.ln(4)
    
    # Event Timeline Count
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Event Timeline", ln=True)
    pdf.set_font("Helvetica", "", 10)
    timeline_count = len(incident.event_timeline) if incident.event_timeline else 0
    pdf.cell(0, 6, f"  Total Correlated Events: {timeline_count}", ln=True)
    
    # Footer
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 6, "Generated by ADNEXUS Agentic SOC - The S.H.I.E.L.D", ln=True, align="C")
    
    try:
        pdf_bytes = pdf.output()
    except Exception as e:
        print(f"PDF Error: {e}")
        return Response(content=f"PDF Error: {e}", status_code=500)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=incident_{incident.incident_id}.pdf"}
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
