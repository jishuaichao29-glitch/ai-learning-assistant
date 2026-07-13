'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../ThemeProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentSessionIdRef = useRef<string>('');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/sessions');
      const data = await response.json();
      if (data.sessions && data.sessions.length > 0) {
        setSessions(data.sessions);
        if (!currentSessionId) {
          setCurrentSessionId(data.sessions[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  }, [currentSessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const fetchHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/history?session_id=${sessionId}`);
      const data = await response.json();
      if (data.history && data.history.length > 0) {
        setMessages(data.history);
      } else {
        setMessages([{ role: 'assistant', content: '你好！我是你的智能学习助手。有什么我可以帮你的吗？' }]);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  useEffect(() => {
    if (currentSessionId) {
      fetchHistory(currentSessionId);
    }
  }, [currentSessionId]);

  const createNewSession = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.session) {
        setCurrentSessionId(data.session.id);
        setMessages([{ role: 'assistant', content: '你好！我是你的智能学习助手。有什么我可以帮你的吗？' }]);
        fetchSessions();
      }
    } catch (err) {
      console.error("Error creating session:", err);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('确定要删除这个会话吗？所有聊天记录将被永久删除。')) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        
        if (currentSessionId === sessionId) {
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          if (remainingSessions.length > 0) {
            setCurrentSessionId(remainingSessions[0].id);
          } else {
            setCurrentSessionId('');
            setMessages([]);
          }
        }
      } else {
        alert('删除失败，请稍后重试。');
      }
    } catch (err) {
      console.error("Error deleting session:", err);
      alert('删除失败，请检查网络连接。');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionIdRef.current) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, session_id: currentSessionIdRef.current }),
      });

      if (!response.ok) throw new Error('网络请求失败');

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setIsWaiting(true);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstChunk = true;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messagesList = buffer.split('\n\n');
        
        for (let i = 0; i < messagesList.length - 1; i++) {
          const msg = messagesList[i];
          if (msg.startsWith('data: ')) {
            const jsonStr = msg.substring(6);
            try {
              const data = JSON.parse(jsonStr);
              const chunk = data.chunk;
              
              if (chunk === '[END]') {
                break;
              }

              if (firstChunk) {
                setIsWaiting(false);
                firstChunk = false;
              }

              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  newMessages[newMessages.length - 1] = {
                    ...lastMsg,
                    content: lastMsg.content + chunk,
                  };
                }
                return newMessages;
              });
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
        
        buffer = messagesList[messagesList.length - 1];
        
        if (messagesList.some(m => m.includes('[END]'))) {
          break;
        }
      }
    } catch (error) {
      console.error("Error calling chat API:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，服务器开小差了，请稍后再试。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('确定要清空当前对话的所有记忆吗？此操作不可恢复。')) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/history?session_id=${currentSessionId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setMessages([{ role: 'assistant', content: '记忆已清空，我们重新开始吧！' }]);
        } else {
          alert('清空失败，请稍后重试。');
        }
      } catch (error) {
        console.error('Error clearing history:', error);
        alert('清空失败，请检查网络连接。');
      }
    }
  };

  const markdownComponents = {
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-2 last:mb-0">{children}</p>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-cyan-500">{children}</strong>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-2 last:mb-0 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="text-sm">{children}</li>
    ),
    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      const match = className?.match(/language-(\w+)/);
      if (match) {
        return (
          <pre className="dark:bg-neutral-900/80 bg-gray-100 rounded-lg p-3 text-xs font-mono overflow-x-auto mb-2 last:mb-0 dark:border border-gray-200">
            <code className="dark:text-neutral-300 text-gray-800">{String(children).replace(/\n$/, '')}</code>
          </pre>
        );
      }
      return (
        <code className="px-1.5 py-0.5 rounded dark:bg-white/10 bg-cyan-100 dark:text-cyan-300 text-cyan-700 text-sm font-mono">
          {children}
        </code>
      );
    },
  };

  const formatDate = (timestamp: number | string) => {
    const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
    const date = new Date(numTimestamp * 1000);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-screen dark:bg-neutral-950 bg-gray-50 font-sans">
      <aside className="w-72 backdrop-blur-md dark:bg-black/30 bg-white/80 dark:border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 dark:border-b border-gray-200">
          <button
            onClick={createNewSession}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium transition-colors flex items-center justify-center space-x-2 text-white"
          >
            <span>+</span>
            <span>新建对话</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center justify-between p-3 rounded-xl mb-2 transition-colors ${
                currentSessionId === session.id
                  ? 'dark:bg-cyan-900/30 bg-cyan-100 dark:border border-cyan-500/30 border-cyan-300'
                  : 'dark:hover:bg-white/5 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <button
                onClick={() => setCurrentSessionId(session.id)}
                className="flex-1 text-left"
              >
                <div className="font-medium text-sm truncate dark:text-white text-gray-900">{session.title}</div>
                <div className="text-xs dark:text-neutral-500 text-gray-500 mt-1">{formatDate(session.created_at)}</div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="ml-2 p-1.5 rounded-lg dark:hover:bg-red-900/30 hover:bg-red-100 dark:text-neutral-500 text-gray-400 dark:hover:text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
        
        <div className="p-4 dark:border-t border-gray-200">
          <button
            onClick={toggleTheme}
            className="w-full py-2 rounded-xl dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:border border-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="text-xs dark:text-neutral-400 text-gray-600">{theme === 'dark' ? '亮色模式' : '深色模式'}</span>
          </button>
          <div className="text-xs dark:text-neutral-500 text-gray-500 text-center mt-3">
            {sessions.length} 个对话
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-between items-center px-6 py-4 backdrop-blur-md dark:bg-black/50 bg-white/80 dark:border-b border-gray-200 z-10 sticky top-0">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse"></div>
            <h1 className="text-lg font-medium tracking-wide dark:text-white text-gray-900">AI Chat Room</h1>
          </div>
          
          <div className="flex space-x-4">
            <Link href="/" className="px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-md dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:border border-gray-200 transition-colors flex items-center space-x-2 dark:text-white text-gray-900">
              <span>🏠</span>
              <span className="hidden sm:inline">返回首页</span>
            </Link>
            <Link href="/profile" className="px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-md dark:bg-cyan-900/20 bg-cyan-100 hover:dark:bg-cyan-900/40 hover:bg-cyan-200 dark:border border-cyan-500/20 border-cyan-300 text-cyan-600 transition-colors flex items-center space-x-2">
              <span>🌌</span>
              <span className="hidden sm:inline">科技数据看板</span>
            </Link>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-md dark:bg-red-900/20 bg-red-100 hover:dark:bg-red-900/40 hover:bg-red-200 dark:border border-red-500/30 border-red-300 text-red-600 transition-colors flex items-center space-x-2"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">清空记忆</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm sm:text-base leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg' 
                    : 'backdrop-blur-md dark:bg-white/5 bg-gray-100 dark:border border-gray-200 text-gray-800 dark:text-neutral-200'
                }`}>
                  {msg.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isWaiting && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-5 py-3.5 backdrop-blur-md dark:bg-white/5 bg-gray-100 dark:border border-gray-200 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="p-4 sm:p-6 backdrop-blur-md dark:bg-black/50 bg-white/80 dark:border-t border-gray-200">
          <div className="max-w-4xl mx-auto flex items-end space-x-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入您的问题 (按 Enter 发送，Shift+Enter 换行)..."
              className="flex-1 max-h-32 min-h-[50px] p-4 rounded-2xl dark:bg-neutral-900/80 bg-gray-100 dark:border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none text-sm transition-all dark:text-white text-gray-900 placeholder:dark:text-neutral-500 placeholder:text-gray-400"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-[50px] px-6 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:dark:bg-neutral-800 disabled:bg-gray-200 disabled:text-neutral-500 font-medium transition-colors flex items-center justify-center shrink-0 text-white"
            >
              发送 🚀
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
