'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';
import { ArrowLeft } from 'lucide-react';

interface WeeklyActivity {
  date: string;
  count: number;
}

interface TopicStat {
  name: string;
  value: number;
}

interface StatsData {
  total_chats: number;
  ai_words: number;
  topic_stats: TopicStat[];
}

interface UserStats {
  total_chats: number;
  learning_days: number;
  tokens_used: number;
  weekly_activity: WeeklyActivity[];
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { theme } = useTheme();
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchUserStats = fetch('https://ai-learning-assistant-6hw0.onrender.com/api/user/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return Promise.reject(new Error('登录已过期'));
        }
        if (!res.ok) {
          throw new Error('获取学情数据失败');
        }
        return res.json();
      });

    const fetchStats = fetch('https://ai-learning-assistant-6hw0.onrender.com/api/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return Promise.reject(new Error('登录已过期'));
        }
        if (!res.ok) {
          throw new Error('获取统计数据失败');
        }
        return res.json();
      });

    Promise.all([fetchUserStats, fetchStats])
      .then(([userStatsData, statsData]) => {
        setUserStats(userStatsData);
        setStats(statsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('数据加载网络错误:', err);
        setError(err.message || '数据加载失败');
        setLoading(false);
      });
  }, [token, mounted, router]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 10000) return (tokens / 10000).toFixed(1) + 'w';
    if (tokens >= 1000) return (tokens / 1000).toFixed(1) + 'k';
    return tokens.toString();
  };

  if (!mounted) return null;

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-neutral-950' : 'bg-gray-50'}`}>
        <div className={`p-6 lg:p-12 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <Link 
                href="/chat"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105 ${
                  theme === 'dark' 
                    ? 'bg-white/[0.05] text-neutral-300 hover:bg-white/[0.1] hover:text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                返回聊天大厅
              </Link>
              <h1 className={`text-3xl font-bold mt-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                📊 学情数据看板
              </h1>
              <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
                追踪您的学习进度与智能算力消耗
              </p>
            </div>

            {error ? (
              <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            ) : (
              <div className={`p-6 rounded-2xl backdrop-blur-md ${
                theme === 'dark' ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-gray-200'
              }`}>
                <div className={`border-b pb-4 mb-4 ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
                  <p className={`text-xs font-medium uppercase tracking-widest ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                    Learning Analytics / 学情数据看板
                  </p>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-neutral-900/50' : 'bg-gray-100'}`}>
                        <div className={`h-2 w-16 rounded-full mb-3 ${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'} animate-pulse`}></div>
                        <div className={`h-6 w-20 rounded ${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'} animate-pulse`}></div>
                      </div>
                      <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-neutral-900/50' : 'bg-gray-100'}`}>
                        <div className={`h-2 w-16 rounded-full mb-3 ${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'} animate-pulse`}></div>
                        <div className={`h-6 w-20 rounded ${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'} animate-pulse`}></div>
                      </div>
                      <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-neutral-900/50' : 'bg-gray-100'}`}>
                        <div className={`h-2 w-16 rounded-full mb-3 ${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'} animate-pulse`}></div>
                        <div className={`h-6 w-20 rounded ${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'} animate-pulse`}></div>
                      </div>
                    </div>
                    <div className={`h-48 rounded-xl ${theme === 'dark' ? 'bg-neutral-900/50' : 'bg-gray-100'} flex items-end justify-between px-4 pb-4`}>
                      {[1,2,3,4,5,6,7].map((i) => (
                        <div key={i} className="flex flex-col items-center w-8">
                          <div className={`h-${Math.floor(Math.random() * 24) + 8} w-full rounded-t ${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'} animate-pulse`}></div>
                          <div className={`h-2 w-4 rounded mt-2 ${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-200'} animate-pulse`}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-cyan-900/20 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-200'}`}>
                        <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>累计对话轮数</p>
                        <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {userStats?.total_chats || 0}
                        </p>
                      </div>
                      <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-purple-900/20 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                        <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>累计学习天数</p>
                        <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {userStats?.learning_days || 0}
                        </p>
                      </div>
                      <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-emerald-900/20 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                        <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>已消耗智能算力 (Token)</p>
                        <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {formatTokens(userStats?.tokens_used || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <p className={`text-xs font-medium uppercase tracking-widest mb-6 ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                        Last 7 Days Activity / 过去 7 天学习活跃趋势
                      </p>
                      <div className="h-48 flex items-end justify-around">
                        {userStats?.weekly_activity.map((item, index) => {
                          const maxBarHeight = 160;
                          const referenceMax = 50;
                          let barHeight = 4;
                          if (item.count > 0) {
                            barHeight = Math.min((item.count / referenceMax) * maxBarHeight, maxBarHeight);
                            barHeight = Math.max(barHeight, 4);
                          }
                          return (
                            <div key={index} className="flex flex-col items-center w-10">
                              <div 
                                className={`w-6 rounded-t-md transition-all duration-500 ${
                                  item.count > 0 
                                    ? 'bg-gradient-to-t from-emerald-500 to-teal-400' 
                                    : theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-300'
                                }`}
                                style={{ height: `${barHeight}px` }}
                              ></div>
                              <span className={`text-[10px] mt-2 ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                                {item.date}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t pt-6 mt-6">
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
                              {stats?.total_chats || 0}
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
                              {(stats?.ai_words || 0).toLocaleString()}
                            </span>
                            <span className={`text-xs ml-2 ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>个字符</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6 mt-6">
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
                          {stats?.topic_stats?.map((topic, index) => {
                            const totalTopicCount = stats?.topic_stats.reduce((sum, item) => sum + item.value, 0) || 1;
                            const percentage = Math.round((topic.value / totalTopicCount) * 100);
                            const isEven = index % 2 === 0;
                            const barColor = isEven 
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                              : 'bg-gradient-to-r from-purple-500 to-pink-500';

                            return (
                              <div key={topic.name} className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className={`font-medium flex items-center space-x-2 ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-800'}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${isEven ? 'bg-cyan-400' : 'bg-purple-400'}`}></span>
                                    <span>{topic.name}</span>
                                  </span>
                                  <span className={`text-xs ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                                    <span className={`font-mono font-semibold ${isEven ? 'text-cyan-400' : 'text-purple-400'} mr-1`}>{topic.value}</span> 次对话 
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
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}