import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Activity, Crosshair, Server } from 'lucide-react';
import { getDashboardStats, getIncidents, startSimulation } from '../services/api';
import type { SecurityIncident } from '../types';


export default function Dashboard() {
  const [stats, setStats] = useState<any>({
    total_events: 0,
    active_incidents: 0,
    detections_count: 0,
    avg_risk_score: 0,
    risk_summary: { high: 0, medium: 0, low: 0 }
  });
  const [recentIncidents, setRecentIncidents] = useState<SecurityIncident[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, incidentsRes] = await Promise.all([
        getDashboardStats().catch(() => ({ data: { total_events: 0, active_incidents: 0, detections_count: 0, risk_summary: { high: 0, medium: 0, low: 0 } } })),
        getIncidents().catch(() => ({ data: [] }))
      ]);
      
      // Calculate avg risk from recent incidents or default to 0
      const incs = incidentsRes.data || [];
      const totalRisk = incs.reduce((sum: number, inc: any) => sum + (inc.risk_score || 0), 0);
      const avgRisk = incs.length > 0 ? totalRisk / incs.length : 0;
      
      setStats({
        ...statsRes.data,
        avg_risk_score: avgRisk
      });
      setRecentIncidents(incs.slice(0, 3));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartSimulation = async (scenario: string) => {
    try {
      setSimulationStatus(`Starting ${scenario}...`);
      await startSimulation(scenario);
      setSimulationStatus(`Running scenario: ${scenario}`);
      setTimeout(() => setSimulationStatus(null), 3000);
    } catch (e) {
      setSimulationStatus('Simulation failed to start');
      setTimeout(() => setSimulationStatus(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-display text-cyber-neonCyan mb-2">SOC COMMAND CENTER</h1>
          <p className="text-gray-400">Real-time threat monitoring and agentic response platform.</p>
        </div>
        {simulationStatus && (
          <div className="glass-panel px-4 py-2 text-cyber-neonGreen animate-pulse border-cyber-neonGreen">
            {simulationStatus}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="TOTAL EVENTS" value={(stats?.total_events || 0).toLocaleString()} icon={<Activity />} color="text-cyber-neonCyan" />
        <KPICard title="ACTIVE INCIDENTS" value={(stats?.active_incidents || 0).toString()} icon={<ShieldAlert />} color="text-cyber-neonRed" />
        <KPICard title="DETECTIONS" value={(stats?.detections_count || 0).toString()} icon={<Crosshair />} color="text-cyber-neonPurple" />
        <KPICard title="AVG RISK SCORE" value={Math.round(stats?.avg_risk_score || 0).toString()} icon={<Server />} color="text-cyber-neonGreen" />
      </div>

      <div className="glass-panel p-6 h-96 bracket-panel">
        <h2 className="text-xl font-display mb-4 text-gray-300">THREAT VOLUME OVER TIME</h2>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats?.timeline || []} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#151e32" vertical={false} />
            <XAxis dataKey="time" stroke="#4b5563" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickMargin={10} />
            <YAxis stroke="#4b5563" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={55} tickMargin={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(12, 17, 32, 0.9)', borderColor: '#00f3ff', color: '#fff', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
              itemStyle={{ color: '#00f3ff' }}
            />
            <Area type="natural" dataKey="events" stroke="#00f3ff" strokeWidth={3} fillOpacity={1} fill="url(#colorEvents)" activeDot={{ r: 6, fill: '#00f3ff', stroke: '#0c1120', strokeWidth: 2 }} />
            <Area type="natural" dataKey="alerts" stroke="#ff003c" strokeWidth={3} fillOpacity={1} fill="url(#colorAlerts)" activeDot={{ r: 6, fill: '#ff003c', stroke: '#0c1120', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-display mb-4">RECENT INCIDENTS</h2>
          <div className="space-y-3">
            {recentIncidents.length === 0 ? (
              <p className="text-gray-500 italic">No recent incidents</p>
            ) : recentIncidents.map(inc => (
              <div key={inc.id} className="flex justify-between items-center p-3 border border-gray-800 bg-gray-900/50 rounded">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'bg-cyber-neonRed' : 'bg-cyber-neonCyan'}`}></div>
                  <div>
                    <p className="font-bold">{inc.title}</p>
                    <p className="text-xs text-gray-400">Type: {inc.threat_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-cyber-neonRed font-mono">RISK: {inc.risk_score}</p>
                  <p className="text-xs text-gray-500">{new Date(inc.detected_at).toLocaleTimeString()}</p>
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
              onClick={() => handleStartSimulation('brute_force')}
              className="w-full neon-button text-sm">
              START BRUTE FORCE SCENARIO
            </button>
            <button 
              onClick={() => handleStartSimulation('reconnaissance')}
              className="w-full neon-button text-sm">
              START RECONNAISSANCE SCENARIO
            </button>
            <button 
              onClick={() => handleStartSimulation('exfiltration')}
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
    <div className={`glass-panel px-6 py-4 flex items-center gap-5 rounded-full ${color}`}>
      <div className={`p-4 rounded-full bg-gray-900/50 shadow-inner`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-mono tracking-widest">{title}</p>
        <p className="text-2xl font-bold font-display tracking-wider text-gray-100">{value}</p>
      </div>
    </div>
  );
}
