import { useState, useEffect } from 'react';

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Mock incoming events
    const timer = setInterval(() => {
      setEvents(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toISOString().split('T')[1].split('.')[0],
        type: ['Network Connection', 'Authentication', 'System Process'][Math.floor(Math.random() * 3)],
        severity: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
        source: `192.168.1.${Math.floor(Math.random() * 255)}`
      }, ...prev].slice(0, 50));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display text-cyber-neonCyan">LIVE EVENT STREAM</h1>
      
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-cyber-dark text-cyber-neonCyan font-display text-sm border-b border-gray-800">
            <tr>
              <th className="p-4">TIME</th>
              <th className="p-4">SEVERITY</th>
              <th className="p-4">EVENT TYPE</th>
              <th className="p-4">SOURCE IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {events.map((evt) => (
              <tr key={evt.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="p-4 font-mono text-gray-400">{evt.time}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${
                    evt.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                    evt.severity === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {evt.severity}
                  </span>
                </td>
                <td className="p-4 font-mono">{evt.type}</td>
                <td className="p-4 font-mono text-gray-400">{evt.source}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 font-mono">WAITING FOR EVENTS...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
