export interface NormalizedEvent {
  id: string;
  event_id: string;
  timestamp: string;
  source: string;
  event_type: string;
  severity: string;
  src_ip?: string;
  dst_ip?: string;
  src_port?: number;
  dst_port?: number;
  user?: string;
  hostname?: string;
  process?: string;
  message: string;
}

export interface SecurityIncident {
  id: string;
  incident_id: string;
  title: string;
  threat_type: string;
  status: string;
  severity: string;
  risk_score: number;
  detected_at: string;
  affected_assets: string[];
  source_indicators: any[];
  event_timeline: string[];
  evidence: any[];
  detection_results: any;
  agent_findings?: string;
  mitre_mapping?: any;
  response_recommendations?: string[];
  analyst_notes?: string;
  ai_summary?: string;
}

export interface DashboardStats {
  total_events: number;
  active_incidents: number;
  total_detections: number;
  avg_risk_score: number;
}

export interface SimulationStatus {
  running: boolean;
  scenario?: string;
  events_processed: number;
}
