import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Activity, Crosshair, Server } from 'lucide-react';

const mockData = [
  { time: '10:00', events: 120, alerts: 2 },
  { time: '10:05', events: 250, alerts: 5 },
  { time: '10:10', events: 380, alerts: 12 },
  { time: '10:15', events: 150, alerts: 1 },
  { time: '10:20', events: 180, alerts: 3 },
  { time: '10:25', events: 450, alerts: 18 },
  { time: '10:30', events: 200, alerts: 0 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-cyber-neonCyan mb-2">SOC COMMAND CENTER</h1>
        <p className="text-gray-400">Real-time threat monitoring and agentic response platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="TOTAL EVENTS" value="1,240,593" icon={<Activity />} color="text-cyber-neonCyan" />
        <KPICard title="ACTIVE INCIDENTS" value="12" icon={<ShieldAlert />} color="text-cyber-neonRed" />
        <KPICard title="DETECTIONS" value="48" icon={<Crosshair />} color="text-cyber-neonPurple" />
        <KPICard title="MONITORED ASSETS" value="156" icon={<Server />} color="text-cyber-neonGreen" />
      </div>

      <div className="glass-panel p-6 h-96 bracket-panel">
        <h2 className="text-xl font-display mb-4 text-gray-300">THREAT VOLUME OVER TIME</h2>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData}>
            <defs>
              <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff003c" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ff003c" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#151e32" />
            <XAxis dataKey="time" stroke="#4b5563" />
            <YAxis stroke="#4b5563" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0c1120', borderColor: '#00f3ff', color: '#fff' }}
              itemStyle={{ color: '#00f3ff' }}
            />
            <Area type="monotone" dataKey="events" stroke="#00f3ff" fillOpacity={1} fill="url(#colorEvents)" />
            <Area type="monotone" dataKey="alerts" stroke="#ff003c" fillOpacity={1} fill="url(#colorAlerts)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-display mb-4">RECENT INCIDENTS</h2>
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-800 bg-gray-900/50 rounded">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyber-neonRed animate-pulse"></div>
                  <div>
                    <p className="font-bold">Brute Force Attack</p>
                    <p className="text-xs text-gray-400">Target: 10.0.0.5</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-cyber-neonRed font-mono">RISK: 85</p>
                  <p className="text-xs text-gray-500">10 mins ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="glass-panel p-6">
          <h2 className="text-xl font-display mb-4">SIMULATION CONTROLS</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Launch a deterministic attack scenario to observe the Agentic SOC response pipeline in real-time.</p>
            <button 
              onClick={() => fetch('http://localhost:8000/api/simulation/start/brute_force', { method: 'POST' })}
              className="w-full neon-button text-sm">
              START BRUTE FORCE SCENARIO
            </button>
            <button 
              onClick={() => fetch('http://localhost:8000/api/simulation/start/reconnaissance', { method: 'POST' })}
              className="w-full neon-button text-sm">
              START RECONNAISSANCE SCENARIO
            </button>
            <button 
              onClick={() => fetch('http://localhost:8000/api/simulation/start/exfiltration', { method: 'POST' })}
              className="w-full neon-button text-sm">
              START DATA EXFILTRATION SCENARIO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="glass-panel p-5 flex items-center gap-4 border-l-4" style={{ borderLeftColor: 'currentColor' }}>
      <div className={`p-3 rounded-lg bg-gray-900 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400 font-mono">{title}</p>
        <p className="text-2xl font-bold font-display tracking-wider">{value}</p>
      </div>
    </div>
  );
}
