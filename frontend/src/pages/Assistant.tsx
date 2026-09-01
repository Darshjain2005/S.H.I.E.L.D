import { useState, useRef, useEffect } from 'react';
import { queryAssistant } from '../services/api';
import { Send, Terminal, Bot, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello, Analyst. I am your AI SOC Assistant. How can I help you investigate today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await queryAssistant(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || "No response received." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with AI core. Please check backend connection." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] relative">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-display text-cyber-neonPurple mb-2 flex items-center gap-3 tracking-widest drop-shadow-[0_0_15px_rgba(157,0,255,0.5)]">
          <Terminal className="w-8 h-8" /> AI ASSISTANT
        </h1>
        <p className="text-gray-400">Query the LLM agent for threat analysis and context</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 flex-shrink-0">
        {['Analyze the latest incident', 'What MITRE techniques were detected?', 'Suggest firewall rules'].map(prompt => (
          <button 
            key={prompt}
            onClick={() => setInput(prompt)}
            className="px-4 py-2 text-xs font-mono font-bold tracking-wide border border-cyber-neonPurple/50 text-cyber-neonPurple rounded-full bg-cyber-neonPurple/5 hover:bg-cyber-neonPurple/20 hover:border-cyber-neonPurple transition-all hover:shadow-[0_0_10px_rgba(157,0,255,0.3)] hover:scale-105 flex items-center gap-2"
          >
            <Sparkles className="w-3 h-3" /> {prompt}
          </button>
        ))}
      </div>

      <div className="flex-1 glass-panel bracket-panel mb-24 overflow-hidden relative flex flex-col shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[80%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border shadow-lg ${msg.role === 'user' ? 'bg-gray-800 border-gray-600' : 'bg-cyber-neonPurple/20 border-cyber-neonPurple/50 shadow-[0_0_10px_rgba(157,0,255,0.3)]'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-gray-300" /> : <Bot className="w-5 h-5 text-cyber-neonPurple" />}
                  </div>

                  {/* Bubble */}
                  <div className={`p-4 rounded-2xl relative ${msg.role === 'user' ? 'bg-gray-800 text-white rounded-tr-sm border border-gray-700 shadow-md' : 'bg-gradient-to-br from-cyber-neonPurple/10 to-transparent border-l-2 border-cyber-neonPurple text-gray-200 rounded-tl-sm backdrop-blur-sm'}`}>
                    <div className="text-[10px] text-gray-500 mb-2 font-mono tracking-widest">{msg.role === 'user' ? 'ANALYST' : 'AI CORE'}</div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  </div>

                </div>
              </motion.div>
            ))}
            {loading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex justify-start"
              >
                <div className="flex gap-4 max-w-[80%]">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-cyber-neonPurple/20 border border-cyber-neonPurple/50 shadow-[0_0_10px_rgba(157,0,255,0.3)]">
                    <Bot className="w-5 h-5 text-cyber-neonPurple" />
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyber-neonPurple/10 to-transparent border-l-2 border-cyber-neonPurple rounded-tl-sm flex items-center justify-center h-[56px] min-w-[80px]">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-2 h-2 rounded-full bg-cyber-neonPurple animate-bounce shadow-[0_0_5px_#9d00ff]" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-cyber-neonPurple animate-bounce shadow-[0_0_5px_#9d00ff]" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-cyber-neonPurple animate-bounce shadow-[0_0_5px_#9d00ff]" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Input Bar */}
      <div className="absolute bottom-0 left-0 w-full z-10 pb-4 pt-8 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent">
        <div className="flex items-center gap-2 p-2 bg-gray-900/60 backdrop-blur-xl border border-cyber-neonPurple/30 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] mx-auto max-w-4xl">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Query the AI core..."
            className="flex-1 bg-transparent px-6 py-3 text-white focus:outline-none font-mono placeholder-gray-500"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 rounded-full bg-cyber-neonPurple/20 text-cyber-neonPurple border border-cyber-neonPurple/50 hover:bg-cyber-neonPurple hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-cyber-neonPurple/20 disabled:hover:text-cyber-neonPurple shadow-[0_0_15px_rgba(157,0,255,0.2)] hover:shadow-[0_0_25px_rgba(157,0,255,0.6)] flex items-center justify-center active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
