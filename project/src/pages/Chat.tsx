import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Terminal, Moon, Sun, Trash2, LogOut, Plus, User, Pencil, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getChats, createChat, deleteChat, getChatMessages, updateChatTitle, type Chat, type Message } from '../lib/chat';

interface Profile {
  username: string | null;
  avatar_url: string | null;
}

function Chat() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  useEffect(() => {
    if (session?.id) {
      loadChats();
    }
  }, [session?.id]);

  useEffect(() => {
    if (isInitialLoad && session?.id && chats.length === 0) {
      createNewChat();
      setIsInitialLoad(false);
    }
  }, [chats, session?.id, isInitialLoad]);

  useEffect(() => {
    if (currentChatId) {
      loadChatHistory(currentChatId);
    }
  }, [currentChatId]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setDarkMode(true);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    if (!session?.id) return;
    try {
      const chatList = await getChats(session.id);
      setChats(chatList);
      if (chatList.length > 0 && !currentChatId) {
        setCurrentChatId(chatList[0].id);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadChatHistory = async (chatId: string) => {
    if (!session?.id) return;
    try {
      const chatHistory = await getChatMessages(chatId);
      setMessages(chatHistory);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const createNewChat = async () => {
    if (!session?.id) return;
    try {
      const newChat = await createChat(session.id);
      setChats([newChat, ...chats]);
      setCurrentChatId(newChat.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!session?.id) return;
    try {
      await deleteChat(chatId);
      setChats(chats.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        const nextChat = chats.find(chat => chat.id !== chatId);
        if (nextChat) {
          setCurrentChatId(nextChat.id);
        } else {
          createNewChat();
        }
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const startEditingChat = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const saveEditingChat = async () => {
    if (!editingChatId || !editingTitle.trim()) return;

    try {
      await updateChatTitle(editingChatId, editingTitle.trim());
      setChats(chats.map(chat => 
        chat.id === editingChatId 
          ? { ...chat, title: editingTitle.trim() }
          : chat
      ));
      setEditingChatId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const clearChat = async () => {
    if (!session?.id || !currentChatId) return;
    setMessages([]);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session?.id || !currentChatId) return;

    const userMessage = {
      content: input,
      sender: 'user' as const,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          chat_id: currentChatId,
          user_id: session.id
        }),
      });

      const data = await response.json();

      const botMessage = {
        content: data.response,
        sender: 'bot' as const,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        content: 'Sorry, something went wrong. Please try again.',
        sender: 'bot' as const,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const openWebshell = () => {
    const webshellUrl = `http://${window.location.hostname}:4444`;
    window.open(webshellUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`min-h-screen flex ${
        darkMode ? 'bg-keystone-black text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 ${
          darkMode ? 'bg-keystone-gray-dark' : 'bg-white'
        } border-r ${
          darkMode ? 'border-keystone-gray-light' : 'border-gray-200'
        } transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-2">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-keystone-red hover:bg-red-700 text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
          <button
            onClick={openWebshell}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-keystone-red text-keystone-red hover:bg-keystone-red hover:text-white transition-colors"
          >
            <Terminal className="w-5 h-5" />
            Open Webshell
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-7rem)]">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`flex items-center justify-between px-4 py-3 hover:bg-keystone-gray-light transition-colors ${
                currentChatId === chat.id
                  ? darkMode
                    ? 'bg-keystone-gray-light'
                    : 'bg-gray-100'
                  : ''
              }`}
            >
              {editingChatId === chat.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEditingChat();
                      }
                    }}
                    className={`flex-1 px-2 py-1 rounded ${
                      darkMode
                        ? 'bg-keystone-gray-dark text-white'
                        : 'bg-white text-gray-900'
                    }`}
                    autoFocus
                  />
                  <button
                    onClick={saveEditingChat}
                    className="p-1 text-green-500 hover:text-green-400"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingChatId(null)}
                    className="p-1 text-red-500 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setCurrentChatId(chat.id)}
                    className="flex-1 text-left truncate"
                  >
                    {chat.title}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditingChat(chat)}
                      className="p-1 text-gray-400 hover:text-gray-300"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteChat(chat.id)}
                      className="p-1 text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col ml-64">
        {/* Fixed Header */}
        <header
          className={`fixed top-0 right-0 left-64 z-10 px-6 py-4 border-b ${
            darkMode ? 'border-keystone-gray-light bg-keystone-gray-dark' : 'border-gray-200 bg-white'
          } shadow-sm`}
        >
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/keystone-logo.png" alt="Keystone" className="h-8" />
              <h1 className="text-xl font-semibold">Security Suite</h1>
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => navigate('/settings')}
                className="relative group"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-keystone-gray-light' : 'bg-gray-100'
                  }`}>
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                aria-label="Toggle theme"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={clearChat}
                className={`p-2 rounded-lg ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                aria-label="Clear chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className={`p-2 rounded-lg ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col mt-16 mb-20">
          <div
            className={`flex-1 overflow-y-auto rounded-lg p-4 ${
              darkMode ? 'bg-keystone-gray-dark' : 'bg-white'
            } shadow-sm`}
          >
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mb-4 ${
                    message.sender === 'user' ? 'ml-auto' : 'mr-auto'
                  } max-w-[80%]`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? darkMode
                          ? 'bg-keystone-red text-white'
                          : 'bg-keystone-red text-white'
                        : darkMode
                        ? 'bg-keystone-gray-light text-gray-100'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.sender === 'user' ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <ReactMarkdown
                        components={{
                          code({node, inline, className, children, ...props}) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={atomDark}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                    <span
                      className={`text-xs ${
                        message.sender === 'user'
                          ? 'text-red-100'
                          : darkMode
                          ? 'text-gray-400'
                          : 'text-gray-500'
                      } block mt-1`}
                    >
                      {message.created_at ? formatTime(new Date(message.created_at)) : ''}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 items-center"
              >
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-keystone-red animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-keystone-red animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-keystone-red animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Fixed Input Field */}
        <div
          className={`fixed bottom-0 right-0 left-64 p-4 ${
            darkMode ? 'bg-keystone-black' : 'bg-gray-50'
          } border-t ${darkMode ? 'border-keystone-gray-light' : 'border-gray-200'}`}
        >
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your security query... (Shift + Enter for new line)"
              className={`flex-1 px-4 py-2 rounded-lg border resize-none min-h-[44px] max-h-32 ${
                darkMode
                  ? 'bg-keystone-gray-dark border-keystone-gray-light text-white placeholder-gray-400'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-keystone-red`}
              rows={1}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg bg-keystone-red text-white flex items-center gap-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
              }`}
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

export default Chat;