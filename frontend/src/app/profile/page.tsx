'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';

interface TopicStat {
  name: string;
  value: number;
}

interface StatsData {
  total_chats: number;
  ai_words: number;
  topic_stats: TopicStat[];
}

export default function ProfileDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { token } = useAuth();

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('未能成功连接到后端数据引擎');
        }
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || '数据加载失败');
        setLoading(false);
      });
  }, [token]);

  const totalTopicCount = data?.topic_stats.reduce((sum, item) => sum + item.value, 0) || 1;

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center font-sans ${
        theme === 'dark' ? 'bg-black text-neutral-400' : 'bg-white text-gray-600'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
        <p className="text-sm tracking-widest text-cyan-500/80 animate-pulse">正在穿透后台动态计算学情账单...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-6 font-sans ${
        theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'
      }`}>
        <div className={`p-6 max-w-sm w-full backdrop-blur-md rounded-2xl text-center ${
          theme === 'dark' 
            ? 'bg-red-950/20 border border-red-500/30' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <h2 className="text-xl font-bold text-red-400 mb-2">数据链路发生异常</h2>
          <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-600'}`}>
            {error || '无法解析数据库结构'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className={`px-4 py-2 rounded-xl text-xs transition ${
              theme === 'dark' 
                ? 'bg-red-500/20 hover:bg-red-500/40 border border-red-500/50' 
                : 'bg-red-100 hover:bg-red-200 border border-red-300 text-red-600'
            }`}
          >
            重试连接
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen relative overflow-hidden font-sans ${
        theme === 'dark' ? 'bg-neutral-950 text-neutral-100' : 'bg-gray-50 text-gray-900'
      }`}>
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] dark:bg-purple-900/20 bg-purple-200/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] dark:bg-cyan-900/20 bg-cyan-200/30 rounded-full blur-[120px] pointer-events-none"></div>

      <header className={`sticky top-0 z-50 backdrop-blur-md px-6 py-4 flex justify-between items-center ${
        theme === 'dark' ? 'bg-black/40 border-b border-white/5' : 'bg-white/80 border-b border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 animate-pulse"></div>
          <h1 className={`text-base font-semibold tracking-wider ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent' 
              : 'text-gray-900'
          }`}>
            AI 学情自画像看板
          </h1>
        </div>
        
        <div className="flex space-x-3">
          <Link 
            href="/chat" 
            className={`px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition flex items-center space-x-1 ${
              theme === 'dark' 
                ? 'bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-400' 
                : 'bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 text-cyan-700'
            }`}
          >
            <span>← 返回聊天室</span>
          </Link>
          <Link 
            href="/" 
            className={`px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition flex items-center space-x-1 ${
              theme === 'dark' 
                ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300' 
                : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'
            }`}
          >
            <span>🏠 返回首页</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8 relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className={`p-6 rounded-2xl backdrop-blur-md flex flex-col justify-between hover:border-cyan-500/30 transition-all duration-300 group ${
            theme === 'dark' ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <div>
              <p className={`text-xs font-medium uppercase tracking-widest mt-1 ${
                theme === 'dark' ? 'text-neutral-500 group-hover:text-cyan-400' : 'text-gray-500 group-hover:text-cyan-600'
              } transition-colors`}>
                Total Interactions / 累计交互
              </p>
              <h3 className={`text-sm mt-1 ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-600'}`}>
                您向 AI 助手发起提问的真实总频率
              </h3>
            </div>
            <div className="mt-8">
              <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                {data.total_chats}
              </span>
              <span className={`text-xs ml-2 ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>次提问</span>
            </div>
          </div>

          <div className={`p-6 rounded-2xl backdrop-blur-md flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300 group ${
            theme === 'dark' ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <div>
              <p className={`text-xs font-medium uppercase tracking-widest mt-1 ${
                theme === 'dark' ? 'text-neutral-500 group-hover:text-purple-400' : 'text-gray-500 group-hover:text-purple-600'
              } transition-colors`}>
                AI Knowledge Escort / 智能守护
              </p>
              <h3 className={`text-sm mt-1 ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-600'}`}>
                AI 助手为您深度解答的累计全量字数
              </h3>
            </div>
            <div className="mt-8">
              <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                {data.ai_words.toLocaleString()}
              </span>
              <span className={`text-xs ml-2 ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>个字符</span>
            </div>
          </div>

        </div>

        <div className={`p-6 rounded-2xl backdrop-blur-md hover:border-neutral-800 transition-all ${
          theme === 'dark' ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className={`border-b pb-4 mb-6 ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
            <p className={`text-xs font-medium uppercase tracking-widest ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
              Topic Distribution / 学习主题映射
            </p>
            <h3 className={`text-sm mt-1 ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-600'}`}>
              基于自然语言模糊匹配分析出的学情比重
            </h3>
          </div>

          <div className="space-y-6">
            {data.topic_stats.map((topic, index) => {
              const percentage = Math.round((topic.value / totalTopicCount) * 100);
              const isEven = index % 2 === 0;
              const barColor = isEven 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500';
              const textColor = isEven ? 'text-cyan-400' : 'text-purple-400';

              return (
                <div key={topic.name} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className={`font-medium flex items-center space-x-2 ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-800'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isEven ? 'bg-cyan-400' : 'bg-purple-400'}`}></span>
                      <span>{topic.name}</span>
                    </span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                      <span className={`font-mono font-semibold ${textColor} mr-1`}>{topic.value}</span> 次对话 
                      <span className="mx-1.5">|</span> 
                      <span className="font-mono">{percentage}%</span>
                    </span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden border ${
                    theme === 'dark' ? 'bg-neutral-900 border-white/[0.02]' : 'bg-gray-100 border-gray-200'
                  }`}>
                    <div 
                      className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className={`text-center text-[10px] tracking-widest pt-4 ${
          theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'
        }`}>
          DATA AGGREGATION ENGINE v1.0 • REAL-TIME SQL TRANSACTION PERSISTENCE
        </footer>
      </main>
    </div>
    </ProtectedRoute>
  );
}
