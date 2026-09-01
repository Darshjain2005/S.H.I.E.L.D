import { useState, useEffect } from 'react';
import { startSimulation, stopSimulation, getSimulationStatus } from '../services/api';
import { Play, Square, Shield, Eye, Database, Activity, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Simulation() {
  const [status, setStatus] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await getSimulationStatus();
        if (res.data && res.data.running) {
          setStatus(`SCENARIO [${res.data.scenario.toUpperCase()}] ACTIVE`);
          setIsRunning(true);
        } else {
          setStatus(prev => prev && prev.includes('ACTIVE') ? null : prev);
          setIsRunning(false);
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
      setStatus(`LAUNCHING [${scenario.toUpperCase()}]...`);
      setIsRunning(true);
      await startSimulation(scenario);
    } catch (e) {
      setStatus(`ERROR: FAILED TO LAUNCH [${scenario.toUpperCase()}]`);
      setIsRunning(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleStop = async () => {
    try {
      setStatus('ABORTING SEQUENCE...');
      await stopSimulation();
      setStatus('SIMULATION TERMINATED.');
      setIsRunning(false);
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus('ERROR: FAILED TO ABORT');
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <div className="space-y-8 relative min-h-[calc(100vh-100px)]">
      {/* Background Holographic Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(#00f3ff 1px, transparent 1px), linear-gradient(90deg, #00f3ff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-panel p-6 bg-gray-900/60 border-cyber-neonCyan/30 shadow-[inset_0_0_50px_rgba(0,243,255,0.05)]">
        <div>
          <h1 className="text-3xl font-display text-cyber-neonCyan mb-2 flex items-center gap-3 drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]">
            <Target className="w-8 h-8" /> HOLODEC LAUNCH CONTROL
          </h1>
          <p className="text-gray-400 font-mono text-sm tracking-widest">AWAITING DIRECTIVE // SOC CAPABILITY EVALUATION MODULE</p>
        </div>
        
        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
          {/* Status Radar Console */}
          <div className="flex items-center gap-4 bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 w-full md:w-auto min-w-[300px]">
            <div className="relative flex items-center justify-center w-8 h-8">
              {isRunning ? (
                <>
                  <div className="absolute w-full h-full border-2 border-cyber-neonGreen rounded-full opacity-50"></div>
                  <div className="absolute w-full h-full border-t-2 border-cyber-neonGreen rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
                  <div className="w-2 h-2 bg-cyber-neonGreen rounded-full shadow-[0_0_10px_#00ff9d]"></div>
                </>
              ) : (
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              )}
            </div>
            <div className="flex-1 font-mono text-xs tracking-widest text-right">
              <span className="text-gray-500 block text-[9px] mb-1">SYSTEM STATUS</span>
              <span className={isRunning ? 'text-cyber-neonGreen animate-pulse' : 'text-gray-500'}>
                {status || 'STANDBY MODE'}
              </span>
            </div>
          </div>

          <button 
            onClick={handleStop}
            disabled={!isRunning && !status?.includes('ABORT')}
            className={`flex items-center gap-2 px-6 py-3 font-display tracking-widest rounded transition-all active:scale-95 shadow-inner w-full md:w-auto justify-center ${isRunning || status?.includes('ABORT') ? 'bg-cyber-neonRed/10 border-2 border-cyber-neonRed text-cyber-neonRed hover:bg-cyber-neonRed hover:text-white shadow-[0_0_20px_rgba(255,0,60,0.4)] stripes' : 'bg-gray-900 border border-gray-800 text-gray-600 cursor-not-allowed'}`}
            style={isRunning ? { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,0,60,0.1) 10px, rgba(255,0,60,0.1) 20px)' } : {}}
          >
            <Square className="w-5 h-5 fill-current" /> ABORT SEQUENCE
          </button>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        <ScenarioCard 
          title="BRUTE FORCE"
          description="Simulates a high-velocity credential stuffing attack against SSH (port 22) followed by a simulated successful infiltration."
          icon={<Shield className="w-10 h-10 text-cyber-neonCyan" />}
          colorClass="neonCyan"
          onStart={() => handleStart('brute_force')}
          disabled={isRunning}
        />
        <ScenarioCard 
          title="RECONNAISSANCE"
          description="Simulates aggressive Nmap port scanning behavior typical of an initial infiltration and mapping phase."
          icon={<Eye className="w-10 h-10 text-cyber-neonPurple" />}
          colorClass="neonPurple"
          onStart={() => handleStart('reconnaissance')}
          disabled={isRunning}
        />
        <ScenarioCard 
          title="DATA EXFILTRATION"
          description="Simulates a large outbound data transfer anomaly resembling the theft of sensitive internal database files."
          icon={<Database className="w-10 h-10 text-orange-500" />}
          colorClass="orange-500"
          onStart={() => handleStart('exfiltration')}
          disabled={isRunning}
        />
        <ScenarioCard 
          title="CIC-IDS2017 CORE"
          description="Runs the full DiodeGuard machine learning pipeline evaluating actual historic network flow metrics."
          icon={<Activity className="w-10 h-10 text-cyber-neonGreen" />}
          colorClass="neonGreen"
          onStart={() => handleStart('cic_ids2017')}
          disabled={isRunning}
        />
      </motion.div>
    </div>
  );
}

function ScenarioCard({ title, description, icon, onStart, colorClass, disabled }: { title: string, description: string, icon: React.ReactNode, onStart: () => void, colorClass: string, disabled: boolean }) {
  const itemVariant = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } }
  };

  // Map colors for dynamic tailwind classes
  const colorMap: Record<string, { bg: string, border: string, text: string, shadow: string, hoverShadow: string }> = {
    'neonCyan': { bg: 'bg-cyber-neonCyan/5', border: 'border-cyber-neonCyan', text: 'text-cyber-neonCyan', shadow: 'shadow-[0_0_15px_rgba(0,243,255,0.2)]', hoverShadow: 'shadow-[0_0_30px_rgba(0,243,255,0.4)]' },
    'neonPurple': { bg: 'bg-cyber-neonPurple/5', border: 'border-cyber-neonPurple', text: 'text-cyber-neonPurple', shadow: 'shadow-[0_0_15px_rgba(157,0,255,0.2)]', hoverShadow: 'shadow-[0_0_30px_rgba(157,0,255,0.4)]' },
    'orange-500': { bg: 'bg-orange-500/5', border: 'border-orange-500', text: 'text-orange-500', shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]', hoverShadow: 'shadow-[0_0_30px_rgba(249,115,22,0.4)]' },
    'neonGreen': { bg: 'bg-cyber-neonGreen/5', border: 'border-cyber-neonGreen', text: 'text-cyber-neonGreen', shadow: 'shadow-[0_0_15px_rgba(0,255,157,0.2)]', hoverShadow: 'shadow-[0_0_30px_rgba(0,255,157,0.4)]' }
  };

  const colors = colorMap[colorClass];

  return (
    <motion.div 
      variants={itemVariant}
      whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -10 }}
      className={`glass-panel p-8 flex flex-col h-full border-t-4 ${colors.border} ${colors.bg} relative overflow-hidden group transition-all duration-300 ${!disabled ? 'cursor-pointer hover:bg-gray-800/60 ' + colors.hoverShadow : 'opacity-60 cursor-not-allowed'}`}
    >
      {/* Background Glow */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl ${colors.bg} opacity-50 group-hover:opacity-100 transition-opacity`}></div>

      <div className="flex flex-col items-center text-center mb-6 relative z-10">
        <div className={`w-24 h-24 rounded-full border-2 ${colors.border} flex items-center justify-center mb-6 ${colors.shadow} bg-gray-950 relative`}>
          {/* Inner ring */}
          <div className={`absolute inset-2 rounded-full border border-dashed ${colors.border} opacity-50 ${!disabled && 'group-hover:animate-[spin_4s_linear_infinite]'}`}></div>
          {icon}
        </div>
        <h2 className="text-xl font-display tracking-widest text-gray-200 group-hover:text-white transition-colors">{title}</h2>
      </div>
      
      <p className="text-gray-400 text-sm flex-1 mb-8 text-center leading-relaxed font-mono relative z-10">
        {description}
      </p>
      
      <button 
        onClick={onStart}
        disabled={disabled}
        className={`w-full py-3 flex justify-center items-center gap-2 font-display tracking-widest rounded transition-all active:scale-95 shadow-inner relative z-10 ${!disabled ? `bg-gray-900 border ${colors.border} ${colors.text} hover:${colors.bg} hover:text-white` : 'bg-gray-900 border border-gray-800 text-gray-600'}`}
      >
        <Play className={`w-5 h-5 ${!disabled ? 'fill-current' : ''}`} /> {disabled ? 'SYSTEM LOCKED' : 'INITIATE'}
      </button>
    </motion.div>
  );
}
