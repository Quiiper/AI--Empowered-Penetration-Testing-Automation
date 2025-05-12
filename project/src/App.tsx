import React, { useState, useRef, useEffect } from 'react';
import { Send, Shield, Moon, Sun, Trash2 } from 'lucide-react';

interface Message {
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

function App() {
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const [messages, setMessages] = useState<Message[]>([{
    content: "Hello! I'm your Pentest Assistant. How can I help with your penetration testing needs today?",
    sender: 'bot',
    timestamp: formatTime(new Date())
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setDarkMode(true);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const clearChat = () => {
    setMessages([{
      content: "Hello! I'm your Pentest Assistant. How can I help with your penetration testing needs today?",
      sender: 'bot',
      timestamp: formatTime(new Date())
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      content: input,
      sender: 'user' as const,
      timestamp: formatTime(new Date())
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();
      
      const botMessage = {
        content: data.response,
        sender: 'bot' as const,
        timestamp: formatTime(new Date())
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        content: 'Sorry, something went wrong. Please try again.',
        sender: 'bot' as const,
        timestamp: formatTime(new Date())
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-semibold">Pentest Assistant</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={clearChat}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              aria-label="Clear chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col">
        <div className={`flex-1 overflow-y-auto rounded-lg p-4 mb-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${message.sender === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[80%]`}
            >
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? darkMode 
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-100'
                      : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <span className={`text-xs ${message.sender === 'user' ? 'text-blue-100' : darkMode ? 'text-gray-400' : 'text-gray-500'} block mt-1`}>
                  {message.timestamp}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 items-center text-gray-500">
              <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about penetration testing..."
            className={`flex-1 px-4 py-2 rounded-lg border ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg bg-blue-500 text-white flex items-center gap-2 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
