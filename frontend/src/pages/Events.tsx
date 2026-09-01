import { useState, useEffect } from 'react';
import { getEvents } from '../services/api';
import type { NormalizedEvent } from '../types';
import { RefreshCw } from 'lucide-react';

export default function Events() {
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [loading, setLoading] = useState(true);

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
      case 'LOW': return 'text-cyber-neonGreen border-cyber-neonGreen';
      default: return 'text-cyber-neonCyan border-cyber-neonCyan';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display text-cyber-neonCyan mb-2">LIVE EVENTS</h1>
          <p className="text-gray-400">Raw telemetry from {events.length} monitored sensors</p>
        </div>
        <button onClick={fetchEventsData} className="neon-button flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> REFRESH
        </button>
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase bg-gray-900/50 text-gray-400 border-b border-gray-800">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Event Type</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {loading && events.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500">Loading...</td></tr>
            ) : events.map(event => (
              <tr key={event.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-mono text-gray-400">{new Date(event.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 text-cyber-neonCyan">{event.event_type}</td>
                <td className="px-4 py-3">{event.source}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs border rounded ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                </td>
                <td className="px-4 py-3 truncate max-w-xs" title={event.message}>{event.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
