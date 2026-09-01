import { useState, useEffect } from 'react';
import { startSimulation, stopSimulation, getSimulationStatus } from '../services/api';
import { Play, Square, Shield, Eye, Database } from 'lucide-react';

export default function Simulation() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await getSimulationStatus();
        if (res.data && res.data.running) {
          setStatus(`Scenario '${res.data.scenario}' is running.`);
        } else {
          // Only clear if we aren't showing a temporary message like 'Stopping simulation...'
          setStatus(prev => prev && prev.includes('running') ? null : prev);
        }
      } catch (e) {
        console.error("Failed to fetch simulation status", e);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (scenario: string) => {
    try {
      setStatus(`Launching ${scenario}...`);
      await startSimulation(scenario);
      setStatus(`Scenario '${scenario}' is running.`);
    } catch (e) {
      setStatus(`Error starting ${scenario}`);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleStop = async () => {
    try {
      setStatus('Stopping simulation...');
      await stopSimulation();
      setStatus('Simulation stopped.');
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus('Error stopping simulation');
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display text-cyber-neonCyan mb-2">THREAT SIMULATION</h1>
          <p className="text-gray-400">Launch deterministic attack scenarios to evaluate SOC capabilities</p>
        </div>
        <div className="flex items-center gap-4">
          {status && (
            <div className="px-4 py-2 border border-cyber-neonGreen text-cyber-neonGreen rounded animate-pulse">
              {status}
            </div>
          )}
          <button 
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 border border-cyber-neonRed text-cyber-neonRed hover:bg-cyber-neonRed/10 rounded transition-colors"
          >
            <Square className="w-4 h-4" /> STOP SIMULATION
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ScenarioCard 
          title="BRUTE FORCE"
          description="Simulates a credential stuffing attack against SSH (port 22) followed by a successful login."
          icon={<Shield className="w-8 h-8 text-cyber-neonCyan" />}
          onStart={() => handleStart('brute_force')}
        />
        <ScenarioCard 
          title="RECONNAISSANCE"
          description="Simulates aggressive Nmap port scanning behavior typical of an initial infiltration phase."
          icon={<Eye className="w-8 h-8 text-cyber-neonPurple" />}
          onStart={() => handleStart('reconnaissance')}
        />
        <ScenarioCard 
          title="DATA EXFILTRATION"
          description="Simulates a large outbound data transfer resembling theft of sensitive database files."
          icon={<Database className="w-8 h-8 text-cyber-neonRed" />}
          onStart={() => handleStart('exfiltration')}
        />
        <ScenarioCard 
          title="CIC-IDS2017 (DIODEGUARD)"
          description="Runs the full DiodeGuard machine learning pipeline on actual network flow metrics."
          icon={<Database className="w-8 h-8 text-cyber-neonGreen" />}
          onStart={() => handleStart('cic_ids2017')}
        />
      </div>
    </div>
  );
}

function ScenarioCard({ title, description, icon, onStart }: { title: string, description: string, icon: React.ReactNode, onStart: () => void }) {
  return (
    <div className="glass-panel p-6 flex flex-col h-full border-t-2 border-cyber-neonCyan">
      <div className="flex items-center gap-4 mb-4">
        {icon}
        <h2 className="text-xl font-display">{title}</h2>
      </div>
      <p className="text-gray-400 text-sm flex-1 mb-6">
        {description}
      </p>
      <button 
        onClick={onStart}
        className="neon-button w-full flex justify-center items-center gap-2 mt-auto"
      >
        <Play className="w-4 h-4" /> LAUNCH SCENARIO
      </button>
    </div>
  );
}
