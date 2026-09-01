import { useState, useEffect } from 'react';
import { getIncidents, updateIncident } from '../services/api';
import type { SecurityIncident } from '../types';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';

export default function Incidents() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchIncidentsData = async () => {
    try {
      const res = await getIncidents();
      setIncidents(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidentsData();
    const interval = setInterval(fetchIncidentsData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateIncident(id, { status });
      fetchIncidentsData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotesChange = async (id: string, notes: string) => {
    try {
      await updateIncident(id, { analyst_notes: notes });
    } catch (e) {
      console.error(e);
    }
  };

  const downloadReport = (incident_id: string) => {
    window.open(`http://localhost:8000/api/incidents/${incident_id}/report`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-cyber-neonRed mb-2">INCIDENT RESPONSE</h1>
        <p className="text-gray-400">Manage active threats and agentic investigations</p>
      </div>

      <div className="space-y-4">
        {incidents.map(inc => (
          <div key={inc.id} className="glass-panel overflow-hidden transition-all duration-300">
            <div 
              className="p-4 cursor-pointer hover:bg-gray-800/30 flex justify-between items-center"
              onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`px-2 py-1 text-xs border rounded font-mono ${inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'text-cyber-neonRed border-cyber-neonRed' : 'text-cyber-neonCyan border-cyber-neonCyan'}`}>
                  {inc.severity}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{inc.title}</h3>
                  <p className="text-sm text-gray-400">{inc.incident_id} | {inc.threat_type} | {new Date(inc.detected_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-mono">RISK SCORE</p>
                  <p className={`text-xl font-bold ${inc.risk_score > 70 ? 'text-cyber-neonRed' : 'text-cyber-neonCyan'}`}>{inc.risk_score}/100</p>
                </div>
                <div>
                  <span className={`px-2 py-1 text-xs rounded bg-gray-800 border ${inc.status === 'RESOLVED' ? 'border-cyber-neonGreen text-cyber-neonGreen' : 'border-gray-600 text-gray-300'}`}>
                    {inc.status}
                  </span>
                </div>
                {expandedId === inc.id ? <ChevronUp /> : <ChevronDown />}
              </div>
            </div>

            {expandedId === inc.id && (
              <div className="p-6 border-t border-gray-800 bg-gray-900/30 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h4 className="text-cyber-neonPurple font-display text-sm mb-2">AI SUMMARY (AGENT FINDINGS)</h4>
                    <p className="text-sm text-gray-300 bg-gray-900/50 p-3 border-l-2 border-cyber-neonPurple rounded">{inc.ai_summary || "No summary available."}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-gray-400 font-display text-sm mb-2">AFFECTED ASSETS</h4>
                      <ul className="list-disc pl-4 text-sm text-gray-300">
                        {inc.affected_assets?.map((a, i) => <li key={i}>{a}</li>) || <li>None recorded</li>}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-gray-400 font-display text-sm mb-2">MITRE ATT&CK</h4>
                      <div className="flex flex-wrap gap-2">
                        {inc.mitre_mapping && inc.mitre_mapping.length > 0 ? inc.mitre_mapping.map((k, i) => (
                          <span key={i} className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded">{typeof k === 'string' ? k : JSON.stringify(k)}</span>
                        )) : <span className="text-sm text-gray-500">Unmapped</span>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-cyber-neonCyan font-display text-sm mb-2">EVENT TIMELINE</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {inc.event_timeline?.map((evt, i) => (
                        <div key={i} className="text-xs font-mono text-gray-400 bg-gray-900 p-2 rounded truncate">
                          {typeof evt === 'string' ? evt : `${evt.timestamp || ''} | ${evt.event_type || 'Unknown'} | ${evt.src_ip || 'N/A'} -> ${evt.dst_ip || 'N/A'}`}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-cyber-neonGreen font-display text-sm mb-2">RESPONSE RECOMMENDATIONS</h4>
                    <ul className="list-disc pl-4 text-sm text-gray-300">
                      {inc.response_recommendations?.map((r, i) => <li key={i}>{typeof r === 'string' ? r : JSON.stringify(r)}</li>) || <li>Pending automated analysis</li>}
                    </ul>
                  </div>
                </div>

                <div className="space-y-6 border-l border-gray-800 pl-6">
                  <div>
                    <h4 className="text-gray-400 font-display text-sm mb-2">STATUS MANAGEMENT</h4>
                    <select 
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-cyber-neonCyan outline-none"
                      value={inc.status}
                      onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                    >
                      <option value="NEW">NEW</option>
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="CONTAINED">CONTAINED</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="text-gray-400 font-display text-sm mb-2">ANALYST NOTES</h4>
                    <textarea 
                      className="w-full h-32 bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-cyber-neonCyan outline-none resize-none"
                      defaultValue={inc.analyst_notes}
                      onBlur={(e) => handleNotesChange(inc.id, e.target.value)}
                      placeholder="Add investigation notes here..."
                    ></textarea>
                  </div>

                  <button 
                    onClick={() => downloadReport(inc.incident_id)}
                    className="w-full neon-button flex justify-center items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> EXPORT REPORT
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {incidents.length === 0 && (
          <div className="glass-panel p-8 text-center text-gray-500">
            No active incidents found.
          </div>
        )}
      </div>
    </div>
  );
}
