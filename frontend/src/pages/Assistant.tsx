import { useState, useRef, useEffect } from 'react';
import { queryAssistant } from '../services/api';
import { Send, Terminal } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="mb-4">
        <h1 className="text-3xl font-display text-cyber-neonPurple mb-2 flex items-center gap-3">
          <Terminal /> AI ASSISTANT
        </h1>
        <p className="text-gray-400">Query the LLM agent for threat analysis and context</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['Analyze the latest incident', 'What MITRE techniques were detected?', 'Suggest firewall rules'].map(prompt => (
          <button 
            key={prompt}
            onClick={() => setInput(prompt)}
            className="px-3 py-1 text-xs border border-cyber-neonPurple text-cyber-neonPurple rounded hover:bg-cyber-neonPurple/10 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex-1 glass-panel overflow-y-auto p-4 mb-4 space-y-4 bracket-panel">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-4 rounded-lg ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'border border-cyber-neonPurple bg-cyber-neonPurple/5 text-gray-200'}`}>
              <div className="text-xs text-gray-400 mb-1 font-mono">{msg.role === 'user' ? 'ANALYST' : 'AI CORE'}</div>
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] p-4 rounded-lg border border-cyber-neonPurple bg-cyber-neonPurple/5">
              <div className="flex gap-2 items-center text-cyber-neonPurple">
                <div className="w-2 h-2 rounded-full bg-cyber-neonPurple animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-cyber-neonPurple animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-cyber-neonPurple animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command or query..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-cyber-neonPurple outline-none font-mono"
        />
        <button 
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-6 py-3 border border-cyber-neonPurple text-cyber-neonPurple rounded hover:bg-cyber-neonPurple/10 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> SEND
        </button>
      </div>
    </div>
  );
}
