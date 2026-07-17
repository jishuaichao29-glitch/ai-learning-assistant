'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';
import { Copy, Check, Play, Pause, RotateCcw, Clock, ArrowLeft } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}



const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

function FocusTimer() {
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playNotificationSound = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.error('播放提示音失败:', e);
    }
  };

  const switchMode = useCallback(() => {
    if (mode === 'work') {
      setMode('break');
      setTimeLeft(BREAK_TIME);
    } else {
      setMode('work');
      setTimeLeft(WORK_TIME);
    }
    setIsRunning(false);
    playNotificationSound();
  }, [mode]);

  useEffect(() => {
    let intervalId: number | null = null;
    
    const runTimer = () => {
      intervalId = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            switchMode();
            const totalTime = mode === 'work' ? WORK_TIME : BREAK_TIME;
            return totalTime;
          }
          return prev - 1;
        });
      }, 1000);
    };

    if (isRunning) {
      runTimer();
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, switchMode, mode]);

  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const totalTime = mode === 'work' ? WORK_TIME : BREAK_TIME;
  const progress = (totalTime - timeLeft) / totalTime;
  const circumference = 2 * Math.PI * 130;
  const strokeDashoffset = progress * circumference;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="mb-8">
        <div className={`px-6 py-3 rounded-full text-sm font-semibold ${
          mode === 'work' 
            ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        }`}>
          {mode === 'work' ? '⏰ 专注学习时间' : '☕ 休息时间'}
        </div>
      </div>

      <div className="relative w-72 h-72 mb-8">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="144"
            cy="144"
            r="130"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="dark:text-gray-800 text-gray-200"
          />
          <circle
            cx="144"
            cy="144"
            r="130"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-linear ${
              mode === 'work' 
                ? 'text-red-500'
                : 'text-green-500'
            }`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-6xl font-bold tracking-wider ${
            mode === 'work' 
              ? 'dark:text-red-400 text-red-600'
              : 'dark:text-green-400 text-green-600'
          }`}>
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm dark:text-neutral-500 text-gray-500 mt-2">
            {mode === 'work' ? '保持专注' : '放松一下'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={resetTimer}
          disabled={isRunning}
          className="p-4 rounded-full dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="重置"
        >
          <RotateCcw className="w-5 h-5 dark:text-neutral-400 text-gray-500" />
        </button>
        
        {!isRunning ? (
          <button
            onClick={startTimer}
            className={`p-6 rounded-full shadow-lg transition-all hover:scale-105 ${
              mode === 'work'
                ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30'
                : 'bg-green-500 hover:bg-green-400 text-white shadow-green-500/30'
            }`}
            title="开始"
          >
            <Play className="w-8 h-8" />
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className={`p-6 rounded-full shadow-lg transition-all hover:scale-105 ${
              mode === 'work'
                ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30'
                : 'bg-green-500 hover:bg-green-400 text-white shadow-green-500/30'
            }`}
            title="暂停"
          >
            <Pause className="w-8 h-8" />
          </button>
        )}

        <button
          onClick={switchMode}
          disabled={isRunning}
          className="p-4 rounded-full dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="切换模式"
        >
          <Clock className="w-5 h-5 dark:text-neutral-400 text-gray-500" />
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm dark:text-neutral-500 text-gray-500">
          {isRunning ? (
            <span className={`inline-flex items-center space-x-2 ${
              mode === 'work' ? 'text-red-500' : 'text-green-500'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              <span>{mode === 'work' ? '正在专注中...' : '正在休息中...'}</span>
            </span>
          ) : (
            <span>点击开始按钮启动专注</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function FocusPage() {
  const { theme, toggleTheme } = useTheme();
  const { token, logout, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string>('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        if (data.sessions && data.sessions.length > 0) {
          setCurrentSessionId(data.sessions[0].id);
          currentSessionIdRef.current = data.sessions[0].id;
          loadHistory(data.sessions[0].id);
          setIsSessionLoading(false);
        } else {
          createSession();
        }
      } else {
        createSession();
      }
    } catch (error) {
      console.error('初始化会话失败:', error);
      setIsSessionLoading(false);
    }
  };

  const createSession = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: '专注学习' })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentSessionId(data.session.id);
        currentSessionIdRef.current = data.session.id;
        loadHistory(data.session.id);
        setIsSessionLoading(false);
      } else {
        setIsSessionLoading(false);
      }
    } catch (error) {
      console.error('创建会话失败:', error);
      setIsSessionLoading(false);
    }
  };

  const loadHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/history?session_id=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.history);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionIdRef.current) return;

    const userMessage = input.trim();
    const assistantMessageIndex = messages.length + 1;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: currentSessionIdRef.current,
          is_focus_mode: true
        }),
        signal: controller.signal,
      });

      if (response.status !== 200) {
        const errorText = await response.text();
        console.error(`HTTP Error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: 服务器错误`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('text/event-stream')) {
        const errorText = await response.text();
        console.error('Unexpected content type:', contentType, errorText);
        throw new Error('服务器返回格式错误');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              const chunk = parsed?.chunk;
              if (chunk && typeof chunk === 'string' && chunk !== '[END]') {
                accumulatedContent += chunk;
                setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages.length > assistantMessageIndex) {
                    newMessages[assistantMessageIndex] = { role: 'assistant', content: accumulatedContent };
                  } else {
                    newMessages.push({ role: 'assistant', content: accumulatedContent });
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e, '原始数据:', dataStr);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('发送消息失败:', error);
        const errorMsg = error instanceof Error ? error.message : '网络错误，请重试。';
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleCopy = (index: number) => {
    const message = messages[index];
    navigator.clipboard.writeText(message.content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-lg font-bold mt-3 mb-2 dark:text-white text-gray-900">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-base font-semibold mt-2 mb-1.5 dark:text-white text-gray-900">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-semibold mt-1.5 mb-1 dark:text-white text-gray-900">{children}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-1.5 text-sm dark:text-neutral-300 text-gray-700 leading-relaxed">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-1.5 text-sm dark:text-neutral-300 text-gray-700 space-y-0.5">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-1.5 text-sm dark:text-neutral-300 text-gray-700 space-y-0.5">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="mb-0.5">{children}</li>
    ),
    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      const isBlock = className?.includes('language-');
      return isBlock ? (
        <pre className="bg-gray-900 dark:bg-neutral-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-xs">
          <code>{children}</code>
        </pre>
      ) : (
        <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs dark:text-cyan-400 text-cyan-600 font-mono">{children}</code>
      );
    },
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-3 border-cyan-500 pl-3 italic my-2 text-sm dark:text-neutral-400 text-gray-600">{children}</blockquote>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-2">
        <table className="w-full border-collapse text-sm dark:text-neutral-300 text-gray-700">{children}</table>
      </div>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-left text-xs font-medium">{children}</th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs">{children}</td>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold dark:text-white text-gray-900">{children}</strong>
    ),
  };

  return (
    <ProtectedRoute>
      <div className={`h-screen flex overflow-hidden ${theme === 'dark' ? 'dark:bg-neutral-950' : 'bg-gray-50'}`}>
        <aside className={`w-64 shrink-0 border-r dark:border-gray-800 border-gray-200 ${theme === 'dark' ? 'dark:bg-neutral-900' : 'bg-white'} flex flex-col h-full`}>
          <div className="p-4 border-b dark:border-gray-800 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold dark:text-white text-gray-900">专注空间</h1>
                  <p className="text-xs dark:text-neutral-500 text-gray-500">番茄钟伴学模式</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
              >
                <span className="dark:text-neutral-400 text-gray-500">{theme === 'dark' ? '☀️' : '🌙'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              <Link href="/chat">
                <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl dark:hover:bg-white/10 hover:bg-gray-100 transition-all text-left group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-blue-600/30 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-cyan-600" />
                  </div>
                  <span className="dark:text-neutral-300 text-gray-700">返回聊天</span>
                </button>
              </Link>
            </nav>
          </div>

          <div className="p-4 border-t dark:border-gray-800 border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-semibold">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium dark:text-white text-gray-900 truncate">{user?.username}</p>
                <p className="text-xs dark:text-neutral-500 text-gray-500">专注模式</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"
                title="退出登录"
              >
                <span className="dark:text-neutral-400 text-gray-500 hover:text-red-500">📤</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex h-full">
          <div className={`w-[40%] border-r dark:border-gray-800 border-gray-200 ${theme === 'dark' ? 'dark:bg-neutral-900' : 'bg-white'} h-full`}>
            <FocusTimer />
          </div>

          <div className="flex-1 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'dark:bg-cyan-600 bg-cyan-600 text-white rounded-tr-lg'
                          : 'dark:bg-neutral-800 bg-gray-100 dark:text-white text-gray-900 rounded-tl-lg'
                      }`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={msg.role === 'user' ? {} : markdownComponents}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      <div className="flex items-center justify-end mt-2">
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => handleCopy(idx)}
                            className="p-1.5 opacity-60 hover:opacity-100 rounded-lg hover:dark:bg-white/10 hover:bg-gray-200 transition-all"
                            title="复制"
                          >
                            {copiedIndex === idx ? (
                              <Check size={12} className="text-green-500" />
                            ) : (
                              <Copy size={12} className="dark:text-neutral-400 text-gray-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <footer className={`p-4 border-t dark:border-gray-800 border-gray-200 ${theme === 'dark' ? 'dark:bg-neutral-900' : 'bg-white'}`}>
              <div className="max-w-4xl mx-auto flex items-center space-x-3">
                <div className="px-3 py-2 rounded-xl dark:bg-red-900/20 bg-red-50 border dark:border-red-500/30 border-red-300">
                  <span className="text-xs font-medium dark:text-red-400 text-red-600">🔒 专注模式</span>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isLoading && input.trim()) {
                        handleSend();
                      }
                    }
                  }}
                  placeholder={isLoading ? 'AI 教官正在思考中...' : '输入您的学习问题（严肃模式）...'}
                  disabled={isLoading}
                  className={`flex-1 max-h-[120px] min-h-[48px] p-4 rounded-2xl dark:bg-neutral-900/80 bg-gray-100 dark:border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none text-sm transition-all dark:text-white text-gray-900 placeholder:dark:text-neutral-500 placeholder:text-gray-400 disabled:dark:bg-neutral-950/80 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70`}
                  rows={1}
                  style={{ height: 'auto' }}
                />
                <button
                  onClick={isLoading ? () => abortControllerRef.current?.abort() : handleSend}
                  disabled={!input.trim() && !isLoading || isSessionLoading}
                  className={`h-[48px] px-6 rounded-2xl font-medium transition-colors flex items-center justify-center shrink-0 ${
                    isLoading
                      ? 'bg-red-500 hover:bg-red-400 text-white'
                      : 'bg-cyan-600 hover:bg-cyan-500 disabled:dark:bg-neutral-800 disabled:bg-gray-200 disabled:text-neutral-500 text-white'
                  }`}
                >
                  {isLoading ? (
                    <span>停止 ⏹️</span>
                  ) : (
                    <span>发送 🚀</span>
                  )}
                </button>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
