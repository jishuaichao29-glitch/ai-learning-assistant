'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import MathAccordion from '../../components/MathAccordion';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';
import { Copy, RefreshCw, Check, Star, Mic } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  is_favorited?: boolean;
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
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentSessionIdRef = useRef<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [useRag, setUseRag] = useState(true);
  const useRagRef = useRef(useRag);
  useEffect(() => {
    useRagRef.current = useRag;
  }, [useRag]);
  const { theme, toggleTheme } = useTheme();
  const { token, logout } = useAuth();

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedDraft = localStorage.getItem('chat_draft');
    if (savedDraft && !input) {
      setInput(savedDraft);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const MIN_HEIGHT = 44;
  const MAX_HEIGHT = 200;

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  useEffect(() => {
    const hasRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setVoiceSupported(hasRecognition);
  }, []);

  interface VoiceRecognitionResult {
    isFinal: boolean;
    [0]: { transcript: string };
  }

  interface VoiceRecognitionEvent {
    resultIndex: number;
    results: VoiceRecognitionResult[];
  }

  interface VoiceRecognitionErrorEvent {
    error: string;
  }

  interface VoiceRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onstart?: () => void;
    onresult?: (event: VoiceRecognitionEvent) => void;
    onerror?: (event: VoiceRecognitionErrorEvent) => void;
    onend?: () => void;
    start: () => void;
    stop: () => void;
  }

  const toggleVoiceInput = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!Recognition) {
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const recognition = new Recognition() as VoiceRecognition;
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      textareaRef.current?.focus();
    };

    recognition.onresult = (event: VoiceRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setInput(prev => prev + transcript);
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
    };

    recognition.onerror = (event: VoiceRecognitionErrorEvent) => {
      console.error('语音识别错误:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert('请允许麦克风权限以使用语音输入功能');
      } else if (event.error === 'no-speech') {
        console.log('未检测到语音');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  }, [isRecording]);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const [showFavoriteToast, setShowFavoriteToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleFavorite = async (messageIndex: number) => {
    const userMessage = messages[messageIndex - 1];
    const assistantMessage = messages[messageIndex];
    
    if (!userMessage || !assistantMessage || userMessage.role !== 'user' || assistantMessage.role !== 'assistant') {
      return;
    }

    const isCurrentlyFavorited = assistantMessage.is_favorited || false;

    if (isCurrentlyFavorited) {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/favorites', {
          method: 'DELETE',
          headers: authHeaders,
          body: JSON.stringify({
            content: assistantMessage.content
          })
        });

        const data = await response.json();
        if (data.success) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[messageIndex] = { ...newMessages[messageIndex], is_favorited: false };
            return newMessages;
          });
          setToastMessage('已从知识卡片移除！');
          setShowFavoriteToast(true);
          setTimeout(() => setShowFavoriteToast(false), 2000);
        }
      } catch (error) {
        console.error('取消收藏失败:', error);
      }
    } else {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/favorites', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            title: userMessage.content.substring(0, 100),
            content: assistantMessage.content,
            session_id: currentSessionIdRef.current
          })
        });

        const data = await response.json();
        if (data.success) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[messageIndex] = { ...newMessages[messageIndex], is_favorited: true };
            return newMessages;
          });
          setToastMessage('已成功收入知识卡片！');
          setShowFavoriteToast(true);
          setTimeout(() => setShowFavoriteToast(false), 2000);
        }
      } catch (error) {
        console.error('添加收藏失败:', error);
      }
    }
  };

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.sessions && data.sessions.length > 0) {
        setSessions(data.sessions);
        const currentSession = currentSessionIdRef.current;
        if (!currentSession) {
          setCurrentSessionId(data.sessions[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, token]);

  const fetchHistory = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/history?session_id=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.history && data.history.length > 0) {
        setMessages(data.history);
      } else {
        setMessages([{ role: 'assistant', content: '你好！我是你的智能学习助手。有什么我可以帮你的吗？' }]);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  }, [token]);

  useEffect(() => {
    if (currentSessionId) {
      fetchHistory(currentSessionId);
    }
  }, [currentSessionId, fetchHistory]);

  const createNewSession = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/sessions', {
        method: 'POST',
        headers: authHeaders,
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
        headers: { 'Authorization': `Bearer ${token}` }
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chat_draft');
    }
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: userMessage, session_id: currentSessionIdRef.current, use_rag: useRag, is_focus_mode: false }),
        signal: abortControllerRef.current.signal,
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request aborted by user');
      } else {
        console.error("Error calling chat API:", error);
        setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，服务器开小差了，请稍后再试。' }]);
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      
      const shouldGenerateTitle = messages.length <= 1;
      const currentSession = sessions.find(s => s.id === currentSessionId);
      const isDefaultTitle = currentSession && (currentSession.title === '新对话' || currentSession.title === 'New Chat');
      
      if (shouldGenerateTitle && isDefaultTitle && currentSessionIdRef.current) {
        fetch('http://127.0.0.1:5000/api/chat/generate_title', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ 
            content: userMessage, 
            session_id: currentSessionIdRef.current 
          }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.success && data.title) {
            setSessions(prev => prev.map(s => 
              s.id === currentSessionIdRef.current 
                ? { ...s, title: data.title }
                : s
            ));
          }
        })
        .catch(err => console.error('Error generating title:', err));
      }
    }
  };

  const handleRegenerate = useCallback(async (messageIndex: number) => {
    if (isLoading) return;

    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[messageIndex] = { role: 'assistant', content: '' };
      return newMessages;
    });

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);

    try {
      const currentUseRag = useRagRef.current;
      console.log(`[Regenerate] use_rag: ${currentUseRag}`);
      
      const response = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: userMessage.content, session_id: currentSessionIdRef.current, use_rag: currentUseRag, is_focus_mode: false }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('网络请求失败');

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
                firstChunk = false;
              }

              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[messageIndex] = {
                  ...newMessages[messageIndex],
                  content: newMessages[messageIndex].content + chunk,
                };
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Regenerate request aborted by user');
      } else {
        console.error("Error calling chat API:", error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[messageIndex] = { role: 'assistant', content: '抱歉，服务器开小差了，请稍后再试。' };
          return newMessages;
        });
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleClearHistory = async () => {
    if (confirm('确定要清空当前对话的所有记忆吗？此操作不可恢复。')) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/history?session_id=${currentSessionId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadMessage('请选择 PDF 文件');
        setUploadSuccess(false);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadMessage('');
      setUploadSuccess(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadMessage('请选择 PDF 文件');
        setUploadSuccess(false);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadMessage('');
      setUploadSuccess(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile || !token) return;

    setUploadLoading(true);
    setUploadMessage('正在进行向量化解析...');
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/knowledge/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadMessage(`已成功构建您的私有知识库！共解析 ${data.chunks_count} 个文本块`);
        setUploadSuccess(true);
        setSelectedFile(null);
      } else {
        setUploadMessage(data.error || '上传失败');
        setUploadSuccess(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage('上传失败，请检查网络连接');
      setUploadSuccess(false);
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadMessage('');
    setUploadSuccess(false);
  };

  const CopyButton = ({ text, size = 16, className = '' }: { text: string; size?: number; className?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    };

    return (
      <button
        onClick={handleCopy}
        className={`flex items-center justify-center rounded-lg transition-all hover:dark:bg-white/10 hover:bg-gray-200 ${className}`}
        title={copied ? '已复制' : '复制'}
      >
        {copied ? (
          <Check size={size} className="text-green-500" />
        ) : (
          <Copy size={size} className="dark:text-neutral-400 text-gray-500" />
        )}
      </button>
    );
  };

  const formatDate = (timestamp: number | string) => {
    const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
    const date = new Date(numTimestamp * 1000);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <ProtectedRoute>
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
        
        <div className="p-4 dark:border-t border-gray-200 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full py-2 rounded-xl dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:border border-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="text-xs dark:text-neutral-400 text-gray-600">{theme === 'dark' ? '亮色模式' : '深色模式'}</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full py-2 rounded-xl dark:bg-gradient-to-r from-cyan-900/30 to-blue-900/30 bg-gradient-to-r from-cyan-100 to-blue-100 hover:dark:from-cyan-900/50 hover:dark:to-blue-900/50 hover:from-cyan-200 hover:to-blue-200 dark:border border-cyan-500/30 border-cyan-300 text-cyan-600 transition-all flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
          >
            <span>📚</span>
            <span className="text-xs">上传 PDF 文档</span>
          </button>
          <Link
            href="/notebook"
            className="w-full py-2 rounded-xl dark:bg-amber-900/20 bg-amber-100 hover:dark:bg-amber-900/30 hover:bg-amber-200 dark:border border-amber-500/30 border-amber-300 text-amber-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>📂</span>
            <span className="text-xs">知识卡片</span>
          </Link>
          <Link
            href="/focus"
            className="w-full py-2 rounded-xl dark:bg-red-900/20 bg-red-50 hover:dark:bg-red-900/30 hover:bg-red-100 dark:border border-red-500/30 border-red-200 text-red-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>⏱️</span>
            <span className="text-xs">专注空间</span>
          </Link>
          <Link
            href="/profile"
            className="w-full py-2 rounded-xl dark:bg-purple-900/20 bg-purple-100 hover:dark:bg-purple-900/30 hover:bg-purple-200 dark:border border-purple-500/30 border-purple-300 text-purple-600 transition-colors flex items-center justify-center space-x-2"
          >
            <span>👤</span>
            <span className="text-xs">个人中心</span>
          </Link>
          <button
            onClick={logout}
            className="w-full py-2 rounded-xl dark:bg-red-900/20 bg-red-100 hover:dark:bg-red-900/30 hover:bg-red-200 dark:border border-red-500/30 border-red-300 text-red-600 transition-colors flex items-center justify-center space-x-2"
          >
            <span>🚪</span>
            <span className="text-xs">退出登录</span>
          </button>
          <div className="text-xs dark:text-neutral-500 text-gray-500 text-center mt-1">
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
            <Link href="/dashboard" className="px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-md dark:bg-cyan-900/20 bg-cyan-100 hover:dark:bg-cyan-900/40 hover:bg-cyan-200 dark:border border-cyan-500/20 border-cyan-300 text-cyan-600 transition-colors flex items-center space-x-2">
              <span>🌌</span>
              <span className="hidden sm:inline">学情数据看板</span>
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
                } relative group`}>
                  {msg.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <MathAccordion content={msg.content} />
                  )}
                  
                  {msg.role === 'assistant' && (
                    <div className="flex items-center space-x-1 mt-3 pt-3 border-t dark:border-gray-700 border-gray-200">
                      <CopyButton text={msg.content} size={14} className="p-1.5 opacity-60 hover:opacity-100 hover:dark:bg-white/10 hover:bg-gray-200 rounded-lg transition-all" />
                      <button
                        onClick={() => handleRegenerate(idx)}
                        disabled={isLoading}
                        className="p-1.5 opacity-60 hover:opacity-100 rounded-lg hover:dark:bg-white/10 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="重新生成"
                      >
                        <RefreshCw size={14} className={`dark:text-neutral-400 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleFavorite(idx)}
                        disabled={isLoading}
                        className={`p-1.5 opacity-60 hover:opacity-100 rounded-lg hover:dark:bg-white/10 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${msg.is_favorited ? 'text-yellow-500' : ''}`}
                        title={msg.is_favorited ? '点击取消收藏' : '收藏到知识卡片'}
                      >
                        <Star size={14} className={`${msg.is_favorited ? 'fill-yellow-500 text-yellow-500' : 'dark:text-neutral-400 text-gray-500'}`} />
                      </button>
                    </div>
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
            <button
              onClick={() => setUseRag(!useRag)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 ${
                useRag 
                  ? 'bg-cyan-600 text-white shadow-md' 
                  : 'dark:bg-white/5 bg-gray-100 dark:text-neutral-400 text-gray-500 dark:border border-gray-700 border-gray-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full ${useRag ? 'bg-white' : 'bg-gray-300'}`}></span>
              <span>检索上传文档</span>
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                const newValue = e.target.value;
                setInput(newValue);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('chat_draft', newValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && input.trim()) {
                    handleSend();
                  }
                }
              }}
              placeholder={isLoading ? 'AI 正在思考中，请稍候...' : '输入您的问题 (按 Enter 发送，Shift+Enter 换行)...'}
              disabled={isLoading}
              className={`flex-1 max-h-[${MAX_HEIGHT}px] min-h-[${MIN_HEIGHT}px] p-4 rounded-2xl dark:bg-neutral-900/80 bg-gray-100 dark:border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none text-sm transition-all dark:text-white text-gray-900 placeholder:dark:text-neutral-500 placeholder:text-gray-400 disabled:dark:bg-neutral-950/80 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70`}
              rows={1}
              style={{ height: 'auto' }}
            />
            {voiceSupported && (
              <button
                onClick={toggleVoiceInput}
                disabled={isLoading}
                className={`h-[${MIN_HEIGHT}px] w-[${MIN_HEIGHT}px] rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                    : 'dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:text-neutral-400 text-gray-500 dark:border border-gray-700 border-gray-200'
                }`}
                title={isRecording ? '点击停止录音' : '点击开始语音输入'}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={isLoading ? () => abortControllerRef.current?.abort() : handleSend}
              disabled={!input.trim() && !isLoading}
              className={`h-[${MIN_HEIGHT}px] px-6 rounded-2xl font-medium transition-colors flex items-center justify-center shrink-0 ${
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
      </main>
    </div>

    {showUploadModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 dark:bg-black/70 bg-gray-900/50 backdrop-blur-sm"
          onClick={() => { setShowUploadModal(false); resetUpload(); }}
        ></div>
        <div className="relative w-full max-w-md rounded-2xl dark:bg-neutral-900 bg-white dark:border border-gray-700 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600"></div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl">📚</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold dark:text-white text-gray-900">上传 PDF 文档</h2>
                  <p className="text-xs dark:text-neutral-500 text-gray-500">构建您的私有知识库</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowUploadModal(false); resetUpload(); }}
                className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
              >
                <span className="dark:text-neutral-400 text-gray-500">✕</span>
              </button>
            </div>

            <div 
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                selectedFile 
                  ? 'dark:border-cyan-500/50 border-cyan-500 dark:bg-cyan-900/10 bg-cyan-50' 
                  : 'dark:border-gray-600 border-gray-300 dark:hover:border-cyan-500/50 hover:border-cyan-500'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {selectedFile ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <span className="text-white text-2xl">✓</span>
                  </div>
                  <div>
                    <p className="font-medium dark:text-white text-gray-900 truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-xs dark:text-neutral-500 text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-full dark:bg-white/10 bg-gray-100 flex items-center justify-center">
                    <span className="text-3xl">📄</span>
                  </div>
                  <div>
                    <p className="font-medium dark:text-white text-gray-900">拖拽 PDF 文件到此处</p>
                    <p className="text-xs dark:text-neutral-500 text-gray-500 mt-1">或点击选择文件</p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs dark:text-neutral-600 text-gray-400">
                    <span>支持 .pdf 格式</span>
                    <span>•</span>
                    <span>最大 50MB</span>
                  </div>
                </div>
              )}
            </div>

            {uploadMessage && (
              <div className={`mt-4 p-3 rounded-xl text-sm flex items-center space-x-2 ${
                uploadSuccess 
                  ? 'dark:bg-green-900/20 bg-green-50 dark:text-green-400 text-green-700' 
                  : 'dark:bg-red-900/20 bg-red-50 dark:text-red-400 text-red-700'
              }`}>
                <span>{uploadSuccess ? '✓' : '⚠️'}</span>
                <span>{uploadMessage}</span>
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => { setShowUploadModal(false); resetUpload(); }}
                className="flex-1 py-3 rounded-xl dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:border border-gray-600 border-gray-300 font-medium transition-colors dark:text-white text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploadLoading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:dark:from-neutral-700 disabled:dark:to-neutral-600 disabled:from-gray-300 disabled:to-gray-400 font-medium transition-all text-white shadow-lg shadow-cyan-500/25 disabled:shadow-none flex items-center justify-center space-x-2"
              >
                {uploadLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>正在进行向量化解析...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>上传并构建知识库</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {showFavoriteToast && (
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
        <div className="px-6 py-3 bg-green-600 text-white rounded-full shadow-lg flex items-center space-x-2">
          <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
          <span>{toastMessage}</span>
        </div>
      </div>
    )}

    </ProtectedRoute>
  );
}
