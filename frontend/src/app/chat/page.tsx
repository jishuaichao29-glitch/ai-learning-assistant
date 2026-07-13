'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到底部的辅助函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 获取历史记录
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/history')
      .then(res => res.json())
      .then(data => {
        if(data.history && data.history.length > 0) {
          setMessages(data.history);
        } else {
          setMessages([{role: 'assistant', content: '你好！我是你的智能学习助手。有什么我可以帮你的吗？'}]);
        }
      })
      .catch(err => console.error("Error fetching history:", err));
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
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
    if (confirm('确定要清空所有对话记忆吗？此操作不可恢复。')) {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/history', {
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
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="mb-2 last:mb-0">{children}</p>
    ),
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className="font-semibold text-cyan-400">{children}</strong>
    ),
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-2 last:mb-0 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className="text-sm">{children}</li>
    ),
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
      const match = className?.match(/language-(\w+)/);
      if (match) {
        return (
          <pre className="bg-neutral-900/80 rounded-lg p-3 text-xs font-mono overflow-x-auto mb-2 last:mb-0 border border-white/10">
            <code className="text-neutral-300">{String(children).replace(/\n$/, '')}</code>
          </pre>
        );
      }
      return (
        <code className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 text-sm font-mono">
          {children}
        </code>
      );
    },
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white font-sans">
      {/* 修改后的顶部导航栏：加入两个跳转按钮 */}
      <header className="flex justify-between items-center px-6 py-4 backdrop-blur-md bg-black/50 border-b border-white/10 z-10 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse"></div>
          <h1 className="text-lg font-medium tracking-wide">AI Chat Room</h1>
        </div>
        
        {/* 新增的导航按钮组 */}
        <div className="flex space-x-4">
          <Link href="/" className="px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center space-x-2">
            <span>🏠</span>
            <span className="hidden sm:inline">返回首页</span>
          </Link>
          <Link href="/profile" className="px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-md bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/20 text-cyan-400 transition-colors flex items-center space-x-2">
            <span>🌌</span>
            <span className="hidden sm:inline">科技数据看板</span>
          </Link>
          <button
            onClick={handleClearHistory}
            className="px-4 py-2 rounded-xl text-xs font-medium backdrop-blur-md bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 transition-colors flex items-center space-x-2"
          >
            <span>🗑️</span>
            <span className="hidden sm:inline">清空记忆</span>
          </button>
        </div>
      </header>

      {/* 聊天消息区域 */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm sm:text-base leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg' 
                  : 'backdrop-blur-md bg-white/5 border border-white/10 text-neutral-200'
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
              <div className="max-w-[80%] rounded-2xl px-5 py-3.5 backdrop-blur-md bg-white/5 border border-white/10 flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 底部输入框区域 */}
      <footer className="p-4 sm:p-6 backdrop-blur-md bg-black/50 border-t border-white/10">
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
            className="flex-1 max-h-32 min-h-[50px] p-4 rounded-2xl bg-neutral-900/80 border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none text-sm transition-all"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-[50px] px-6 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 disabled:text-neutral-500 font-medium transition-colors flex items-center justify-center shrink-0"
          >
            发送 🚀
          </button>
        </div>
      </footer>
    </div>
  );
}