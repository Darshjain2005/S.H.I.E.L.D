import { useState, useEffect } from 'react';
import { getEvents } from '../services/api';
import type { NormalizedEvent } from '../types';
import { RefreshCw, Maximize2, Minimize2, AlertTriangle, ShieldAlert, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Events() {
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSeverity, setExpandedSeverity] = useState<string | null>(null);

  const fetchEventsData = async () => {
    try {
      const res = await getEvents();
      setEvents(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsData();
    const interval = setInterval(fetchEventsData, 3000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return 'text-cyber-neonRed border-cyber-neonRed';
      case 'HIGH': return 'text-orange-500 border-orange-500';
      case 'MEDIUM': return 'text-yellow-500 border-yellow-500';
      case 'LOW': 
      case 'INFO': return 'text-cyber-neonGreen border-cyber-neonGreen';
      default: return 'text-cyber-neonCyan border-cyber-neonCyan';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return <ShieldAlert className="text-cyber-neonRed" />;
      case 'HIGH': return <AlertTriangle className="text-orange-500" />;
      case 'MEDIUM': return <Activity className="text-yellow-500" />;
      case 'LOW':
      case 'INFO': return <Info className="text-cyber-neonGreen" />;
      default: return <Activity className="text-cyber-neonCyan" />;
    }
  };

  // Group events and filter out empty/noise messages
  const validEvents = events.filter(e => e.message && e.message.trim() !== '');
  
  const groupedEvents = {
    CRITICAL: validEvents.filter(e => e.severity.toUpperCase() === 'CRITICAL'),
    HIGH: validEvents.filter(e => e.severity.toUpperCase() === 'HIGH'),
    MEDIUM: validEvents.filter(e => e.severity.toUpperCase() === 'MEDIUM'),
    LOW: validEvents.filter(e => ['LOW', 'INFO'].includes(e.severity.toUpperCase())),
  };

  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-3xl font-display text-cyber-neonCyan mb-2">LIVE EVENTS</h1>
          <p className="text-gray-400">Telemetry logs for {validEvents.length} events</p>
        </div>
        <button 
          onClick={fetchEventsData} 
          className="neon-button rounded-full px-6 py-2 flex items-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_25px_rgba(0,243,255,0.4)]"
        >
          <RefreshCw className="w-4 h-4" /> REFRESH
        </button>
      </div>

      <motion.div layout className={`grid flex-1 gap-6 ${expandedSeverity ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <AnimatePresence mode="popLayout">
          {severities.map((severity) => {
            // If a severity is expanded and this is NOT it, hide it.
            if (expandedSeverity && expandedSeverity !== severity) return null;
            
            const evs = groupedEvents[severity as keyof typeof groupedEvents];
            const isExpanded = expandedSeverity === severity;

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                key={severity} 
                className={`glass-panel flex flex-col overflow-hidden group ${isExpanded ? 'h-[calc(100vh-220px)]' : 'h-[400px]'}`}
              >
              {/* Header */}
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/30">
                <div className="flex items-center gap-3">
                  {getSeverityIcon(severity)}
                  <h2 className="text-xl font-display tracking-widest">{severity} EVENTS</h2>
                  <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs font-mono">{evs.length}</span>
                </div>
                <button 
                  onClick={() => setExpandedSeverity(isExpanded ? null : severity)}
                  className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                  {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Table */}
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-sm relative">
                  <thead className="text-xs uppercase bg-gray-900/80 text-gray-400 sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Event Type</th>
                      <th className="px-4 py-3">Source</th>
                      {isExpanded && <th className="px-4 py-3">Severity</th>}
                      <th className="px-4 py-3">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && evs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500 italic">Loading telemetry...</td></tr>
                    ) : evs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500 italic">No {severity.toLowerCase()} events detected.</td></tr>
                    ) : evs.map(event => (
                      <tr key={event.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</td>
                        <td className="px-4 py-3 text-cyber-neonCyan text-xs">{event.event_type}</td>
                        <td className="px-4 py-3 font-mono text-xs">{event.source}</td>
                        {isExpanded && (
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-[10px] border rounded ${getSeverityColor(event.severity)}`}>
                              {event.severity}
                            </span>
                          </td>
                        )}
                        <td className={`px-4 py-3 text-xs ${isExpanded ? '' : 'truncate max-w-[200px]'}`} title={event.message}>
                          {event.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
