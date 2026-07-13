'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

  // 动态数据联调：异步抓取后端“数据大脑”的燃料
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/stats')
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
  }, []);

  // 计算主题分布的总权重，用于计算百分比条
  const totalTopicCount = data?.topic_stats.reduce((sum, item) => sum + item.value, 0) || 1;

  // 优雅的流光骨架屏（Loading 状态）
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-neutral-400 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
        <p className="text-sm tracking-widest text-cyan-500/80 animate-pulse">正在穿透后台动态计算学情账单...</p>
      </div>
    );
  }

  // 接口报错防崩溃机制（Error 降级状态）
  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6">
        <div className="p-6 max-w-sm w-full backdrop-blur-md bg-red-950/20 border border-red-500/30 rounded-2xl text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">数据链路发生异常</h2>
          <p className="text-sm text-neutral-400 mb-6">{error || '无法解析数据库结构'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-xl text-xs transition"
          >
            重试连接
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden font-sans">
      {/* 霓虹背景渐变晕染光晕（高级暗黑科技感） */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 顶部精美导航栏 */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 animate-pulse"></div>
          <h1 className="text-base font-semibold tracking-wider bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            AI 学情自画像看板
          </h1>
        </div>
        <Link 
          href="/" 
          className="px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center space-x-1"
        >
          <span>← 返回聊天室</span>
        </Link>
      </header>

      {/* 看板主体响应式 Grid 布局 */}
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8 relative z-10">
        
        {/* 第一排：核心量化卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 高光数字卡 - 累计交互次数 */}
          <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/10 flex flex-col justify-between hover:border-cyan-500/30 transition-all duration-300 group">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 group-hover:text-cyan-400 transition-colors">
                Total Interactions / 累计交互
              </p>
              <h3 className="text-sm text-neutral-400 mt-1">您向 AI 助手发起提问的真实总频率</h3>
            </div>
            <div className="mt-8">
              <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                {data.total_chats}
              </span>
              <span className="text-xs text-neutral-500 ml-2">次提问</span>
            </div>
          </div>

          {/* 知识量化卡 - AI守护字数 */}
          <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/10 flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300 group">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 group-hover:text-purple-400 transition-colors">
                AI Knowledge Escort / 智能守护
              </p>
              <h3 className="text-sm text-neutral-400 mt-1">AI 助手为您深度解答的累计全量字数</h3>
            </div>
            <div className="mt-8">
              <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                {data.ai_words.toLocaleString()}
              </span>
              <span className="text-xs text-neutral-500 ml-2">个字符</span>
            </div>
          </div>

        </div>

        {/* 第二排：硬核主题分布进度条看板 */}
        <div className="p-6 rounded-2xl backdrop-blur-md bg-white/[0.03] border border-white/10 hover:border-neutral-800 transition-all">
          <div className="border-b border-white/5 pb-4 mb-6">
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
              Topic Distribution / 学习主题映射
            </p>
            <h3 className="text-sm text-neutral-400 mt-1">基于自然语言模糊匹配分析出的学情比重</h3>
          </div>

          <div className="space-y-6">
            {data.topic_stats.map((topic, index) => {
              // 动态计算单条进度条的百分比宽度
              const percentage = Math.round((topic.value / totalTopicCount) * 100);
              
              // 进度条颜色交替渲染，制造青紫错落的流光感
              const isEven = index % 2 === 0;
              const barColor = isEven 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500';
              const textColor = isEven ? 'text-cyan-400' : 'text-purple-400';

              return (
                <div key={topic.name} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-neutral-300 flex items-center space-x-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${isEven ? 'bg-cyan-400' : 'bg-purple-400'}`}></span>
                      <span>{topic.name}</span>
                    </span>
                    <span className="text-xs text-neutral-500">
                      <span className={`font-mono font-semibold ${textColor} mr-1`}>{topic.value}</span> 次对话 
                      <span className="mx-1.5">|</span> 
                      <span className="font-mono">{percentage}%</span>
                    </span>
                  </div>
                  {/* 外层轨道 */}
                  <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-white/[0.02]">
                    {/* 内层流光进度条 */}
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

        {/* 底部专业页脚标注 */}
        <footer className="text-center text-[10px] text-neutral-600 tracking-widest pt-4">
          DATA AGGREGATION ENGINE v1.0 • REAL-TIME SQL TRANSACTION PERSISTENCE
        </footer>
      </main>
    </div>
  );
}