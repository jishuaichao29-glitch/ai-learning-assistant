'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 【核心功能 1】页面一加载，立马去 Flask 后端下载以前的历史记录
  useEffect(() => {
    fetch('http://localhost:5000/api/history?user_id=user1')
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setMessages(data.history);
        }
      })
      .catch((err) => console.error('获取历史记录失败:', err));
  }, []);

  // 【核心功能 2】点击发送，实时将问题提交给 Flask，并拿回真正的 AI 回答
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setLoading(true);

    // 1. 先在前端屏幕上蹦出用户的聊天气泡
    const userMsg = { id: Date.now(), role: 'user', content: userText };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // 2. 使用 fetch 异步请求 Flask 的后端接口
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, user_id: 'user1' }),
      });

      const data = await response.json();

      // 3. 将后端返回的真实 AI 答复刷到屏幕上
      const aiMsg = { id: Date.now() + 1, role: 'assistant', content: data.response };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('通信失败:', error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: '❌ 哎呀，网络开小差了，请检查后端服务是否开启。' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-gray-200 font-sans">
      {/* 左侧历史记录侧边栏 */}
      <aside className="w-64 border-r border-gray-900 bg-gray-950 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-4 border-b border-gray-900 flex justify-between items-center">
            <Link href="/" className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
              🏠 AI.Study
            </Link>
          </div>
          <div className="p-3">
            <button className="w-full py-2 px-4 rounded-xl border border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/10 transition text-sm text-left flex items-center gap-2">
              <span>+</span> 新建对话
            </button>
          </div>
          <nav className="px-3 space-y-1 overflow-y-auto max-h-[60vh]">
            <div className="p-3 rounded-xl bg-gray-900 text-sm text-white font-medium cursor-pointer truncate">
              💬 智能学习助手已就绪
            </div>
          </nav>
        </div>
        <div className="p-4 border-t border-gray-900 text-xs text-gray-600">
          📅 考勤系统已绑定双端逻辑
        </div>
      </aside>

      {/* 右侧主聊天区域 */}
      <main className="flex-grow flex flex-col justify-between bg-gradient-to-b from-gray-950 to-black">
        {/* 顶部状态栏 */}
        <header className="px-6 py-4 border-b border-gray-900 backdrop-blur-md bg-black/50 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            与 Flask 真实数据联调大厅
          </h2>
        </header>

        {/* 聊天气泡滚动区 */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/10'
                    : 'bg-gray-900 text-gray-200 rounded-bl-none border border-gray-800'
                }`}
              >
                <div className="text-xs text-gray-400 mb-1 font-semibold">
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 text-gray-400 rounded-2xl p-4 text-sm animate-pulse">
                AI正在思考中...
              </div>
            </div>
          )}
        </div>

        {/* 底部输入框 */}
        <footer className="p-6 border-t border-gray-900 bg-black max-w-4xl mx-auto w-full">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={loading ? "思考中..." : "可以输入关键词试一试，例如：编程、学习、数学..."}
              disabled={loading}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-4 pl-4 pr-16 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
            >
              发送
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}