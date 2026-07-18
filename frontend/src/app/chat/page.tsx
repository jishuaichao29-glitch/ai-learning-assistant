'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import MathAccordion from '../../components/MathAccordion';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';
import { Copy, RefreshCw, Check, Star, Mic, ThumbsUp, ThumbsDown, Pencil } from 'lucide-react';

interface Message {
  id: string | number;
  role: 'user' | 'assistant' | 'breakpoint';
  content: string;
  is_favorited?: boolean;
  feedback?: 'like' | 'dislike' | null;
  is_editing?: boolean;
  is_liked?: boolean;
  is_disliked?: boolean;
}

interface Session {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  is_pinned: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | number | null>(null);
  const [editingContent, setEditingContent] = useState<Record<number, string>>({});
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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const slashCommands = [
    { trigger: '/总结', prompt: '请用 3 句话为我总结以下内容的重点：' },
    { trigger: '/人话', prompt: '请用最通俗易懂的费曼技巧，向一个文科生解释这个概念：' },
    { trigger: '/翻译', prompt: '请将以下学术内容精准翻译为中文：' },
  ];
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

  const handleFeedback = async (messageIndex: number, feedbackType: 'like' | 'dislike') => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant') return;

    setMessages(prev => {
      const newMessages = [...prev];
      const currentMsg = newMessages[messageIndex];
      
      if (feedbackType === 'like') {
        newMessages[messageIndex] = { 
          ...currentMsg, 
          is_liked: !currentMsg.is_liked,
          is_disliked: false
        };
      } else {
        newMessages[messageIndex] = { 
          ...currentMsg, 
          is_disliked: !currentMsg.is_disliked,
          is_liked: false
        };
      }
      return newMessages;
    });

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/messages/${message.id}/feedback`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ type: feedbackType })
      });
      
      const data = await response.json();
      if (!data.success) {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[messageIndex] = { 
            ...newMessages[messageIndex], 
            is_liked: data.is_liked || false,
            is_disliked: data.is_disliked || false
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
    }
  };

  const handleEditMessage = (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'user') return;

    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[messageIndex] = { ...newMessages[messageIndex], is_editing: true };
      return newMessages;
    });
  };

  const handleCancelEdit = (messageIndex: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[messageIndex] = { ...newMessages[messageIndex], is_editing: false };
      return newMessages;
    });
  };

  const handleSaveAndResend = async (messageIndex: number, newContent: string) => {
    if (!newContent.trim() || isLoading) return;

    const truncatedMessages = messages.slice(0, messageIndex + 1);
    
    setMessages(prev => {
      const newMessages = [...prev.slice(0, messageIndex + 1)];
      newMessages[messageIndex] = { ...newMessages[messageIndex], content: newContent.trim(), is_editing: false };
      return newMessages;
    });

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);

    try {
      const currentUseRag = useRagRef.current;
      
      const response = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ 
          message: newContent.trim(), 
          session_id: currentSessionIdRef.current, 
          use_rag: currentUseRag, 
          is_focus_mode: false 
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('网络请求失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setMessages(prev => [...prev, { id: `msg-${Date.now()}`, role: 'assistant', content: '' }]);
      const newMessageIndex = truncatedMessages.length;

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

              if (data.message_id) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessageIndex] = {
                    ...newMessages[newMessageIndex],
                    id: data.message_id,
                    is_liked: false,
                    is_disliked: false,
                  };
                  return newMessages;
                });
                continue;
              }

              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessageIndex] = {
                  ...newMessages[newMessageIndex],
                  content: newMessages[newMessageIndex].content + chunk,
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
        console.log('Edit request aborted by user');
      } else {
        console.error("Error calling chat API:", error);
        setMessages(prev => [...prev, { id: `msg-${Date.now()}`, role: 'assistant', content: '抱歉，服务器开小差了，请稍后再试。' }]);
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
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

  const debounce = useCallback((func: (...args: any[]) => void, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  const performSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim() || !token) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/search?q=${encodeURIComponent(keyword)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results || []);
        setShowSearchResults(data.results && data.results.length > 0);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [token]);

  const debouncedSearch = useMemo(() => debounce(performSearch, 300), [debounce, performSearch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleSearchResultClick = useCallback((chatId: string) => {
    setCurrentSessionId(chatId);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    searchInputRef.current?.blur();
  }, []);

  const highlightKeyword = useCallback((text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-black px-0.5 rounded">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  }, []);

  const formatSearchDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  useEffect(() => {
    if (token) {
      fetchSessions();
    }
  }, [token]);

  const fetchHistory = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/history?session_id=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log("DEBUG FRONTEND FETCH - raw data:", data);
      if (data.history && data.history.length > 0) {
        console.log("DEBUG FRONTEND FETCH - history (first 3):", data.history.slice(0, 3).map((msg: Message) => ({ id: msg.id, is_liked: msg.is_liked, is_disliked: msg.is_disliked })));
        setMessages(data.history);
      } else {
        setMessages([{ id: 'msg-welcome', role: 'assistant', content: '你好！我是你的智能学习助手。有什么我可以帮你的吗？' }]);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  }, [token]);

  useEffect(() => {
    if (currentSessionId && token) {
      fetchHistory(currentSessionId);
    }
  }, [currentSessionId, token]);

  const createNewSession = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/sessions', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await response.json();
      if (data.session) {
        setCurrentSessionId(data.session.id);
        setMessages([{ id: 'msg-welcome', role: 'assistant', content: '你好！我是你的智能学习助手。有什么我可以帮你的吗？' }]);
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

  const updateSessionTitle = async (sessionId: string, newTitle: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      const data = await response.json();
      
      if (data.success) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
      }
    } catch (err) {
      console.error("Error updating session title:", err);
    }
  };

  const togglePinSession = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;
      
      const response = await fetch(`http://127.0.0.1:5000/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !session.is_pinned })
      });
      const data = await response.json();
      
      if (data.success) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_pinned: !s.is_pinned } : s));
      }
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const content = textToSend || input;
    if (!content.trim() || isLoading || !currentSessionIdRef.current) return;

    const userMessage = content.trim();
    setInput('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chat_draft');
    }
    setMessages(prev => [...prev, { id: `msg-${Date.now()}-user`, role: 'user', content: userMessage }]);
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

      setMessages(prev => [...prev, { id: `msg-${Date.now()}-assistant`, role: 'assistant', content: '', is_liked: false, is_disliked: false }]);
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

              if (data.message_id) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    newMessages[newMessages.length - 1] = {
                      ...lastMsg,
                      id: data.message_id,
                      is_liked: false,
                      is_disliked: false,
                    };
                  }
                  return newMessages;
                });
                continue;
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
        setMessages(prev => [...prev, { id: `msg-${Date.now()}-error`, role: 'assistant', content: '抱歉，服务器开小差了，请稍后再试。' }]);
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
    if (isLoading || regeneratingId) return;

    const userMessage = messages[messageIndex - 1];
    const currentMessage = messages[messageIndex];
    if (!userMessage || userMessage.role !== 'user' || !currentMessage) return;

    setRegeneratingId(currentMessage.id);

    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[messageIndex] = { ...newMessages[messageIndex], content: '' };
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

              if (data.message_id) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    id: data.message_id,
                    is_liked: false,
                    is_disliked: false,
                  };
                  return newMessages;
                });
                continue;
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
          newMessages[messageIndex] = { ...newMessages[messageIndex], content: '抱歉，服务器开小差了，请稍后再试。' };
          return newMessages;
        });
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      setRegeneratingId(null);
    }
  }, [isLoading, regeneratingId, messages]);

  const handleClearHistory = async () => {
    if (confirm('确定要清空当前对话的所有记忆吗？此操作不可恢复。')) {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/history?session_id=${currentSessionId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          setMessages([{ id: 'msg-cleared', role: 'assistant', content: '记忆已清空，我们重新开始吧！' }]);
        } else {
          alert('清空失败，请稍后重试。');
        }
      } catch (error) {
        console.error('Error clearing history:', error);
        alert('清空失败，请检查网络连接。');
      }
    }
  };

  const handleInsertBreakpoint = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/chat/breakpoint', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ session_id: currentSessionIdRef.current })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { id: `msg-${Date.now()}-breakpoint`, role: 'breakpoint', content: '' }]);
        setToastMessage('上下文断点已插入，后续对话将轻装上阵！');
        setShowFavoriteToast(true);
        setTimeout(() => setShowFavoriteToast(false), 2000);
      } else {
        alert('插入断点失败，请稍后重试。');
      }
    } catch (error) {
      console.error('Error inserting breakpoint:', error);
      alert('插入断点失败，请检查网络连接。');
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
        <div className="p-4">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="搜索历史聊天记录..."
              className="w-full px-4 py-2.5 pl-10 rounded-xl dark:bg-white/5 bg-gray-100 dark:border border-gray-700 border-gray-200 text-sm dark:text-white text-gray-900 placeholder-gray-500 focus:outline-none focus:dark:border-cyan-500/50 focus:border-cyan-400 transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {isSearching ? '⏳' : '🔍'}
            </span>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>
          
          {showSearchResults && (
            <div className="mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-[400px] overflow-y-auto">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
                找到 {searchResults.length} 条结果
              </div>
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchResultClick(result.chatId)}
                  className="w-full px-3 py-3 text-left hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      result.role === 'user' 
                        ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' 
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    }`}>
                      {result.role === 'user' ? '我' : 'AI'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatSearchDate(result.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                    {highlightKeyword(result.content, searchQuery)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 pb-4 dark:border-b border-gray-200">
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
                className="flex-1 text-left flex items-start gap-2 min-w-0"
              >
                {session.is_pinned && <span className="flex-shrink-0 text-amber-500">📌</span>}
                <div className="flex-1 flex flex-col min-w-0">
                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateSessionTitle(session.id, editingTitle.trim());
                          setEditingSessionId(null);
                          setEditingTitle('');
                        } else if (e.key === 'Escape') {
                          setEditingSessionId(null);
                          setEditingTitle('');
                        }
                      }}
                      onBlur={() => {
                        if (editingTitle.trim()) {
                          updateSessionTitle(session.id, editingTitle.trim());
                        }
                        setEditingSessionId(null);
                        setEditingTitle('');
                      }}
                      className="text-sm dark:bg-white/10 bg-gray-100 border border-transparent dark:focus:border-cyan-500 focus:border-cyan-300 rounded-lg px-2 py-1 outline-none"
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="font-medium text-sm truncate dark:text-white text-gray-900">{session.title}</div>
                      <div className="text-xs flex-shrink-0 whitespace-nowrap dark:text-neutral-500 text-gray-500 mt-1">{formatDate(session.created_at)}</div>
                    </>
                  )}
                </div>
              </button>
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinSession(session.id);
                  }}
                  className={`ml-1 p-1.5 rounded-lg transition-colors ${
                    session.is_pinned
                      ? 'dark:bg-amber-900/30 bg-amber-100 dark:text-amber-400 text-amber-600'
                      : 'dark:hover:bg-amber-900/30 hover:bg-amber-100 dark:text-neutral-500 text-gray-400 dark:hover:text-amber-400 hover:text-amber-600 opacity-0 group-hover:opacity-100'
                  }`}
                  title={session.is_pinned ? '取消置顶' : '置顶对话'}
                >
                  📌
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSessionId(session.id);
                    setEditingTitle(session.title);
                  }}
                  className="ml-1 p-1.5 rounded-lg dark:hover:bg-cyan-900/30 hover:bg-cyan-100 dark:text-neutral-500 text-gray-400 dark:hover:text-cyan-400 hover:text-cyan-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="修改标题"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="ml-1 p-1.5 rounded-lg dark:hover:bg-red-900/30 hover:bg-red-100 dark:text-neutral-500 text-gray-400 dark:hover:text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="删除对话"
                >
                  🗑️
                </button>
              </div>
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
            <button
              onClick={handleInsertBreakpoint}
              className="w-12 h-12 rounded-xl text-lg font-bold flex items-center justify-center bg-yellow-400 text-black z-50 animate-pulse shadow-lg hover:bg-yellow-300 transition-all"
              title="清除上下文记忆"
            >
              🧹
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, idx) => {
              if (msg.role === 'breakpoint') {
                return (
                  <div key={idx} className="flex items-center justify-center py-4">
                    <div className="flex items-center w-full max-w-md">
                      <div className="flex-1 h-px dark:bg-gray-700 bg-gray-300"></div>
                      <span className="px-4 text-xs dark:text-neutral-500 text-gray-500">以上记忆已归档</span>
                      <div className="flex-1 h-px dark:bg-gray-700 bg-gray-300"></div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm sm:text-base leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg' 
                      : 'backdrop-blur-md dark:bg-white/5 bg-gray-100 dark:border border-gray-200 text-gray-800 dark:text-neutral-200'
                  } relative group`}>
                    {msg.role === 'user' && msg.is_editing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent[idx] ?? msg.content}
                          onChange={(e) => setEditingContent(prev => ({ ...prev, [idx]: e.target.value }))}
                          className="w-full dark:bg-white/10 bg-gray-50 border dark:border-gray-600 border-gray-200 rounded-xl px-3 py-2 text-sm dark:text-white text-gray-900 focus:outline-none focus:dark:border-cyan-500 focus:border-cyan-400 resize-none"
                          rows={3}
                          ref={(el) => { if (el) el.focus(); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              handleSaveAndResend(idx, editingContent[idx] ?? msg.content);
                            }
                          }}
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleCancelEdit(idx)}
                            className="px-3 py-1.5 text-xs dark:bg-white/10 bg-gray-200 hover:dark:bg-white/20 hover:bg-gray-300 rounded-lg dark:text-neutral-300 text-gray-700 transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleSaveAndResend(idx, editingContent[idx] ?? msg.content)}
                            className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white transition-colors"
                          >
                            保存并提交
                          </button>
                        </div>
                      </div>
                    ) : msg.role === 'user' ? (
                      <>
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                        <button
                          onClick={() => handleEditMessage(idx)}
                          className="absolute -top-1 -right-1 p-1 rounded-full dark:bg-white/10 bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="编辑消息"
                        >
                          <Pencil size={12} className="dark:text-neutral-400 text-gray-600" />
                        </button>
                      </>
                    ) : (
                      <MathAccordion content={msg.content} />
                    )}
                  
                    {msg.role === 'assistant' && !msg.is_editing && (
                      <div className="flex items-center space-x-1 mt-3 pt-3 border-t dark:border-gray-700 border-gray-200">
                        <CopyButton text={msg.content} size={14} className="p-1.5 opacity-60 hover:opacity-100 hover:dark:bg-white/10 hover:bg-gray-200 rounded-lg transition-all" />
                        <button
                          onClick={() => handleFeedback(idx, 'like')}
                          className={`p-1.5 rounded-lg transition-all ${msg.is_liked ? 'opacity-100 bg-green-100 dark:bg-green-900/30 text-green-500' : 'opacity-60 hover:opacity-100 hover:dark:bg-white/10 hover:bg-gray-200'}`}
                          title="点赞"
                        >
                          <ThumbsUp size={14} className={`transition-all duration-200 ${msg.is_liked ? 'fill-green-500 text-green-500 scale-110' : 'dark:text-neutral-400 text-gray-500'}`} />
                        </button>
                        <button
                          onClick={() => handleFeedback(idx, 'dislike')}
                          className={`p-1.5 rounded-lg transition-all ${msg.is_disliked ? 'opacity-100 bg-red-100 dark:bg-red-900/30 text-red-500' : 'opacity-60 hover:opacity-100 hover:dark:bg-white/10 hover:bg-gray-200'}`}
                          title="点踩"
                        >
                          <ThumbsDown size={14} className={`transition-all duration-200 ${msg.is_disliked ? 'fill-red-500 text-red-500 scale-110' : 'dark:text-neutral-400 text-gray-500'}`} />
                        </button>
                        <button
                          onClick={() => handleRegenerate(idx)}
                          disabled={!!regeneratingId}
                          className="p-1.5 opacity-60 hover:opacity-100 rounded-lg hover:dark:bg-white/10 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title="重新生成"
                        >
                          <RefreshCw size={14} className={`dark:text-neutral-400 text-gray-500 ${msg.id === regeneratingId ? 'animate-spin' : ''}`} />
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
              );
            })}
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
          <div className="max-w-4xl mx-auto flex items-end w-full gap-3">
            <div className="flex-shrink-0">
              <button
                onClick={() => setUseRag(!useRag)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 ${
                  useRag 
                    ? 'bg-cyan-600 text-white shadow-md' 
                    : 'dark:bg-white/5 bg-gray-100 dark:text-neutral-400 text-gray-500 dark:border border-gray-700 border-gray-200'
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${useRag ? 'bg-white' : 'bg-gray-300'}`}></span>
                <span>检索上传文档</span>
              </button>
            </div>
            <div className="flex-1 min-w-0 relative">
              {showSlashMenu && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-neutral-900 dark:border border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-3 py-2 dark:bg-neutral-800 bg-gray-50 text-xs font-medium dark:text-neutral-400 text-gray-500">快捷指令</div>
                  {slashCommands.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const newInput = cmd.prompt;
                        setInput(newInput);
                        setShowSlashMenu(false);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('chat_draft', newInput);
                        }
                        setTimeout(() => {
                          textareaRef.current?.focus();
                        }, 0);
                      }}
                      className="w-full px-4 py-3 text-left hover:dark:bg-white/5 hover:bg-gray-100 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-sm font-medium">/</span>
                        <div>
                          <div className="text-sm font-medium dark:text-white text-gray-900">{cmd.trigger}</div>
                          <div className="text-xs dark:text-neutral-500 text-gray-500 truncate max-w-[300px]">{cmd.prompt}</div>
                        </div>
                      </div>
                      <span className="text-xs dark:text-neutral-600 text-gray-400">Tab</span>
                    </button>
                  ))}
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setInput(newValue);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('chat_draft', newValue);
                  }
                  if (newValue === '/') {
                    setShowSlashMenu(true);
                  } else if (newValue.endsWith('/') && !newValue.slice(0, -1).includes('/')) {
                    setShowSlashMenu(true);
                  } else {
                    setShowSlashMenu(false);
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
                className={`w-full max-h-[${MAX_HEIGHT}px] min-h-[${MIN_HEIGHT}px] p-4 rounded-2xl dark:bg-neutral-900/80 bg-gray-100 dark:border border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none text-sm transition-all dark:text-white text-gray-900 placeholder:dark:text-neutral-500 placeholder:text-gray-400 disabled:dark:bg-neutral-950/80 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70`}
                rows={1}
                style={{ height: 'auto' }}
              />
            </div>
            <div className="flex-shrink-0 flex items-end gap-2">
              {voiceSupported && (
                <button
                  onClick={toggleVoiceInput}
                  disabled={isLoading}
                  className={`h-[${MIN_HEIGHT}px] w-[${MIN_HEIGHT}px] rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
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
                onClick={isLoading ? () => abortControllerRef.current?.abort() : () => handleSend()}
                disabled={!input.trim() && !isLoading}
                className={`h-[${MIN_HEIGHT}px] px-6 rounded-2xl font-medium transition-colors flex items-center justify-center ${
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
