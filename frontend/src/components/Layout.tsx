import { Link, useLocation } from 'react-router-dom';
import {
  Shield,
  Activity,
  AlertTriangle,
  Terminal,
  Database,
  Menu,
  Play
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top on route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <Activity className="w-5 h-5 min-w-[20px]" /> },
    { name: 'Live Events', path: '/events', icon: <Database className="w-5 h-5 min-w-[20px]" /> },
    { name: 'Incidents', path: '/incidents', icon: <AlertTriangle className="w-5 h-5 min-w-[20px]" /> },
    { name: 'AI Assistant', path: '/assistant', icon: <Terminal className="w-5 h-5 min-w-[20px]" /> },
    { name: 'Simulation', path: '/simulation', icon: <Play className="w-5 h-5 min-w-[20px]" /> },
  ];

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.max(200, Math.min(e.clientX, 500));
    setSidebarWidth(newWidth);
    if (!sidebarOpen) setSidebarOpen(true);
  }, [isResizing, sidebarOpen]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className={`flex h-screen overflow-hidden text-gray-200 relative bg-transparent ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
      {/* Ambient background glows for glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyber-neonCyan/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyber-neonPurple/10 blur-[120px] pointer-events-none"></div>

      {/* Sidebar */}
      <aside
        className={`relative transition-all ${isResizing ? 'duration-0' : 'duration-300 ease-in-out'} flex-shrink-0 border-r border-cyber-neonCyan/20 bg-cyber-panel/30 backdrop-blur-md flex flex-col z-10`}
        style={{ width: sidebarOpen ? sidebarWidth : 80 }}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-cyber-neonCyan/20 overflow-hidden">
          <div className={`flex items-center gap-2 text-cyber-neonCyan transition-all duration-300 ${sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
            <Shield className="w-6 h-6 min-w-[24px]" />
            <span className="font-display font-bold tracking-wider whitespace-nowrap">ADNEXUS</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`text-gray-400 hover:text-cyber-neonCyan transition-all duration-300 p-1.5 rounded-lg hover:bg-cyber-neonCyan/10 ${!sidebarOpen ? 'mx-auto' : ''}`}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-x-hidden">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center p-3 rounded-xl transition-all duration-200 group ${location.pathname === item.path
                  ? 'bg-cyber-neonCyan/10 border border-cyber-neonCyan/30 text-cyber-neonCyan shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                  : 'border border-transparent text-gray-400 hover:text-cyber-neonCyan hover:bg-cyber-neonCyan/5'
                }`}
              title={!sidebarOpen ? item.name : undefined}
            >
              {item.icon}
              <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-auto opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        {/* Resize Handle */}
        {sidebarOpen && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-cyber-neonCyan/50 active:bg-cyber-neonCyan z-50 transition-colors"
            onMouseDown={handleMouseDown}
          ></div>
        )}
      </aside>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 overflow-auto relative bg-transparent scroll-smooth">
        <div className="absolute top-0 right-0 p-4 z-50">
          {/* Status indicators */}
          <div className="flex gap-4 items-center glass-panel px-3 py-1 rounded-full border-opacity-50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyber-neonGreen animate-pulse"></div>
              <span className="text-xs font-mono text-gray-400 tracking-wider">ML ENGINE ONLINE</span>
            </div>
          </div>
        </div>

        <div className="p-8 pb-20 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
