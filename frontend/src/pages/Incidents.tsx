export default function Incidents() {
  const incidents = [
    { id: 'INC-A1B2C3', title: 'Brute Force Attack Detected', status: 'INVESTIGATING', severity: 'HIGH', score: 85, target: '10.0.0.5', time: '10 mins ago' },
    { id: 'INC-D4E5F6', title: 'Suspicious Port Scan', status: 'NEW', severity: 'MEDIUM', score: 45, target: '10.0.0.10', time: '1 hour ago' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display text-cyber-neonCyan">INCIDENT MANAGEMENT</h1>
      
      <div className="grid gap-4">
        {incidents.map(inc => (
          <div key={inc.id} className="glass-panel p-6 bracket-panel hover:border-cyber-neonCyan/50 transition-colors cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-cyber-neonCyan text-sm">{inc.id}</span>
                  <span className="px-2 py-1 text-xs font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {inc.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{inc.title}</h2>
              </div>
              <div className="text-right">
                <div className="text-3xl font-display font-bold text-cyber-neonRed">{inc.score}</div>
                <div className="text-xs text-gray-500 font-mono">RISK SCORE</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-gray-800 pt-4">
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">TARGET ASSET</p>
                <p className="font-mono">{inc.target}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">SEVERITY</p>
                <p className="font-bold text-red-400">{inc.severity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">DETECTED</p>
                <p className="text-gray-400">{inc.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
