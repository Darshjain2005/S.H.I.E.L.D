import { Link, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Terminal, 
  Database,
  Menu
} from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <Activity className="w-5 h-5" /> },
    { name: 'Live Events', path: '/events', icon: <Database className="w-5 h-5" /> },
    { name: 'Incidents', path: '/incidents', icon: <AlertTriangle className="w-5 h-5" /> },
    { name: 'AI Assistant', path: '/assistant', icon: <Terminal className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-cyber-black text-gray-200">
      {/* Background Effects */}
      <div className="cyber-scanline pointer-events-none"></div>
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex-shrink-0 border-r border-cyber-neonCyan/20 bg-cyber-panel/30 backdrop-blur-md`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-cyber-neonCyan/20">
          {sidebarOpen && (
            <div className="flex items-center gap-2 text-cyber-neonCyan">
              <Shield className="w-6 h-6" />
              <span className="font-display font-bold tracking-wider">AGENTIC SOC</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-cyber-neonCyan">
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 p-3 rounded transition-all duration-200 ${
                location.pathname === item.path 
                  ? 'bg-cyber-neonCyan/10 border border-cyber-neonCyan/30 text-cyber-neonCyan shadow-[0_0_10px_rgba(0,243,255,0.2)]' 
                  : 'text-gray-400 hover:text-cyber-neonCyan hover:bg-cyber-neonCyan/5'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span className="font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="absolute top-0 right-0 p-4 z-50">
          {/* Status indicators */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyber-neonGreen animate-pulse"></div>
              <span className="text-xs font-mono text-gray-400">ML ENGINE ONLINE</span>
            </div>
          </div>
        </div>
        
        <div className="p-8 pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}
