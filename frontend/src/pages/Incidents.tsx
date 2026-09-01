import { useState, useEffect } from 'react';
import { getIncidents, updateIncident } from '../services/api';
import type { SecurityIncident } from '../types';
import { ChevronDown, ChevronUp, Download, ShieldAlert, AlertTriangle, Activity, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const getSeverityStyles = (severity: string) => {
    switch(severity.toUpperCase()) {
      case 'CRITICAL': return { border: 'border-cyber-neonRed', text: 'text-cyber-neonRed', bg: 'bg-cyber-neonRed/10', icon: <ShieldAlert className="w-5 h-5" /> };
      case 'HIGH': return { border: 'border-orange-500', text: 'text-orange-500', bg: 'bg-orange-500/10', icon: <AlertTriangle className="w-5 h-5" /> };
      case 'MEDIUM': return { border: 'border-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: <Activity className="w-5 h-5" /> };
      default: return { border: 'border-cyber-neonCyan', text: 'text-cyber-neonCyan', bg: 'bg-cyber-neonCyan/10', icon: <Activity className="w-5 h-5" /> };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-cyber-neonRed mb-2">INCIDENT RESPONSE</h1>
        <p className="text-gray-400">Manage active threats and agentic investigations</p>
      </div>

      <div className="space-y-4">
        {incidents.map(inc => {
          const styles = getSeverityStyles(inc.severity);
          const isExpanded = expandedId === inc.id;

          return (
            <motion.div 
              layout 
              key={inc.id} 
              className={`glass-panel overflow-hidden transition-colors duration-300 border-l-4 ${styles.border} ${isExpanded ? 'shadow-[0_0_20px_rgba(0,0,0,0.6)]' : 'hover:shadow-[0_0_15px_rgba(0,0,0,0.4)] hover:bg-gray-800/20'}`}
            >
              <div 
                className="p-5 cursor-pointer flex justify-between items-center group"
                onClick={() => setExpandedId(isExpanded ? null : inc.id)}
              >
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-full ${styles.bg} ${styles.text}`}>
                    {styles.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg font-display tracking-wider text-gray-200 group-hover:text-white transition-colors">{inc.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full border ${styles.border} ${styles.text}`}>
                        {inc.severity}
                      </span>
                      <p className="text-xs text-gray-400 font-mono">{inc.incident_id} | {inc.threat_type} | {new Date(inc.detected_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right flex items-center gap-3">
                    <Flame className={`w-6 h-6 ${inc.risk_score > 70 ? 'text-cyber-neonRed animate-pulse' : 'text-gray-500'}`} />
                    <div>
                      <p className="text-[10px] text-gray-400 font-mono">RISK SCORE</p>
                      <p className={`text-xl font-bold font-display ${inc.risk_score > 70 ? 'text-cyber-neonRed' : 'text-cyber-neonCyan'}`}>{inc.risk_score}</p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-gray-700/50"></div>
                  <div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-inner ${inc.status === 'RESOLVED' ? 'bg-cyber-neonGreen/10 border-cyber-neonGreen text-cyber-neonGreen' : 'bg-gray-800/50 border-gray-600 text-gray-300'}`}>
                      {inc.status}
                    </span>
                  </div>
                  <div className="text-gray-500 group-hover:text-cyber-neonCyan transition-colors">
                    {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="border-t border-gray-800/50 bg-gray-900/40"
                  >
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="glass-panel p-5 bg-gray-900/50 border-cyber-neonPurple/30 relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full bg-cyber-neonPurple group-hover:shadow-[0_0_10px_#9d00ff] transition-shadow"></div>
                          <h4 className="text-cyber-neonPurple font-display text-xs mb-3 tracking-widest flex items-center gap-2">
                            <Activity className="w-4 h-4" /> AI SUMMARY (AGENT FINDINGS)
                          </h4>
                          <p className="text-sm text-gray-300 leading-relaxed">{inc.ai_summary || "No summary available."}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div className="glass-panel p-4 bg-gray-900/30">
                            <h4 className="text-gray-400 font-display text-xs mb-3 tracking-widest">AFFECTED ASSETS</h4>
                            <ul className="space-y-1">
                              {inc.affected_assets?.map((a, i) => (
                                <li key={i} className="text-sm text-gray-300 font-mono bg-gray-800/50 px-2 py-1 rounded truncate border border-gray-700/50">{a}</li>
                              )) || <li className="text-sm text-gray-500 italic">None recorded</li>}
                            </ul>
                          </div>
                          <div className="glass-panel p-4 bg-gray-900/30">
                            <h4 className="text-gray-400 font-display text-xs mb-3 tracking-widest">MITRE ATT&CK</h4>
                            <div className="flex flex-wrap gap-2">
                              {inc.mitre_mapping && inc.mitre_mapping.length > 0 ? inc.mitre_mapping.map((k, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-cyber-neonCyan/10 text-cyber-neonCyan border border-cyber-neonCyan/30 rounded-full">{typeof k === 'string' ? k : JSON.stringify(k)}</span>
                              )) : <span className="text-sm text-gray-500 italic">Unmapped</span>}
                            </div>
                          </div>
                        </div>

                        <div className="glass-panel p-5 bg-gray-900/30">
                          <h4 className="text-cyber-neonCyan font-display text-xs mb-3 tracking-widest">EVENT TIMELINE</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {inc.event_timeline?.map((evt, i) => (
                              <div key={i} className="text-xs font-mono text-gray-400 bg-gray-950/50 p-2.5 rounded border border-gray-800/50 flex gap-4">
                                <span className="text-cyber-neonCyan/50">{i + 1}.</span>
                                <span className="truncate">{typeof evt === 'string' ? evt : `${evt.timestamp || ''} | ${evt.event_type || 'Unknown'} | ${evt.src_ip || 'N/A'} -> ${evt.dst_ip || 'N/A'}`}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="glass-panel p-5 bg-cyber-neonGreen/5 border-cyber-neonGreen/20">
                          <h4 className="text-cyber-neonGreen font-display text-xs mb-3 tracking-widest">RESPONSE RECOMMENDATIONS</h4>
                          <ul className="list-disc pl-4 text-sm text-gray-300 space-y-1">
                            {inc.response_recommendations?.map((r, i) => <li key={i}>{typeof r === 'string' ? r : JSON.stringify(r)}</li>) || <li className="text-gray-500 italic">Pending automated analysis</li>}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="glass-panel p-5 bg-gray-900/50 border-gray-700/50 h-full flex flex-col">
                          <h4 className="text-gray-400 font-display text-xs mb-4 tracking-widest border-b border-gray-800 pb-2">COMMAND CENTER</h4>
                          
                          <div className="mb-6">
                            <label className="block text-xs text-gray-500 font-mono mb-2">STATUS MANAGEMENT</label>
                            <select 
                              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-cyber-neonCyan focus:ring-1 focus:ring-cyber-neonCyan outline-none transition-all shadow-inner"
                              value={inc.status}
                              onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                            >
                              <option value="NEW">NEW</option>
                              <option value="INVESTIGATING">INVESTIGATING</option>
                              <option value="CONTAINED">CONTAINED</option>
                              <option value="RESOLVED">RESOLVED</option>
                            </select>
                          </div>

                          <div className="flex-1 mb-6 flex flex-col">
                            <label className="block text-xs text-gray-500 font-mono mb-2">ANALYST NOTES</label>
                            <textarea 
                              className="w-full flex-1 min-h-[150px] bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 focus:border-cyber-neonCyan focus:ring-1 focus:ring-cyber-neonCyan outline-none resize-none transition-all shadow-inner custom-scrollbar"
                              defaultValue={inc.analyst_notes}
                              onBlur={(e) => handleNotesChange(inc.id, e.target.value)}
                              placeholder="Add investigation notes here..."
                            ></textarea>
                          </div>

                          <button 
                            onClick={() => downloadReport(inc.incident_id)}
                            className="w-full neon-button rounded-full py-3 flex justify-center items-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,243,255,0.1)] hover:shadow-[0_0_20px_rgba(0,243,255,0.3)] mt-auto"
                          >
                            <Download className="w-4 h-4" /> EXPORT FULL REPORT
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        
        {incidents.length === 0 && (
          <div className="glass-panel p-12 text-center text-gray-500 font-display tracking-widest border-dashed">
            NO ACTIVE INCIDENTS DETECTED
          </div>
        )}
      </div>
    </div>
  );
}
