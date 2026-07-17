'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';
import { Star, Trash2, BookOpen, ArrowLeft, Loader2, Search, X } from 'lucide-react';

interface FavoriteItem {
  id: number;
  session_id: string;
  user_id: number;
  title: string;
  content: string;
  timestamp: number;
}

export default function NotebookPage() {
  const { theme, toggleTheme } = useTheme();
  const { token, logout, user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeCard, setActiveCard] = useState<FavoriteItem | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setFavorites(data.data);
      }
    } catch (error) {
      console.error('获取收藏列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/favorites/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFavorites(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('删除收藏失败:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-xl font-bold mt-4 mb-2 dark:text-white text-gray-900">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-lg font-semibold mt-3 mb-2 dark:text-white text-gray-900">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-base font-semibold mt-2 mb-1 dark:text-white text-gray-900">{children}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-2 dark:text-neutral-300 text-gray-700 whitespace-pre-wrap break-words">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-2 dark:text-neutral-300 text-gray-700">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-2 dark:text-neutral-300 text-gray-700">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="mb-1 whitespace-pre-wrap break-words">{children}</li>
    ),
    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      const isBlock = className?.includes('language-');
      return isBlock ? (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-2 text-sm">
          <code>{children}</code>
        </pre>
      ) : (
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-sm dark:text-cyan-400 text-cyan-600 font-mono">{children}</code>
      );
    },
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-cyan-500 pl-4 italic my-2 dark:text-neutral-400 text-gray-600">{children}</blockquote>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-2">
        <table className="w-full border-collapse dark:text-neutral-300 text-gray-700 text-sm">{children}</table>
      </div>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-left text-xs font-medium">{children}</th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm">{children}</td>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold dark:text-white text-gray-900">{children}</strong>
    ),
  };

  return (
    <ProtectedRoute>
      <div className={`min-h-screen flex ${theme === 'dark' ? 'dark:bg-neutral-950' : 'bg-gray-50'}`}>
        <aside className={`w-64 shrink-0 border-r dark:border-gray-800 border-gray-200 ${theme === 'dark' ? 'dark:bg-neutral-900' : 'bg-white'} flex flex-col`}>
          <div className="p-4 border-b dark:border-gray-800 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold dark:text-white text-gray-900">知识卡片</h1>
                  <p className="text-xs dark:text-neutral-500 text-gray-500">问答精华收藏</p>
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium dark:text-white text-gray-900 truncate">{user?.username}</p>
                <p className="text-xs dark:text-neutral-500 text-gray-500">知识卡片模式</p>
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

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold dark:text-white text-gray-900 flex items-center space-x-3">
                  <Star className="w-7 h-7 fill-yellow-400 text-yellow-400" />
                  <span>我的知识卡片</span>
                </h2>
                <p className="text-sm dark:text-neutral-500 text-gray-500 mt-1">
                  共收藏 {favorites.length} 条精华问答
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                <p className="mt-4 dark:text-neutral-400 text-gray-500">加载中...</p>
              </div>
            ) : favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center mb-6">
                  <BookOpen className="w-12 h-12 dark:text-neutral-600 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">还没有收藏</h3>
                <p className="dark:text-neutral-500 text-gray-500 mb-6">在聊天页面点击 ⭐️ 按钮，将精华问答收入知识卡片</p>
                <Link href="/chat">
                  <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-medium text-white transition-all shadow-lg shadow-cyan-500/25">
                    去聊天
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {favorites.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-all duration-300 hover:shadow-xl ${theme === 'dark' ? 'dark:bg-neutral-900 dark:border-gray-800 hover:dark:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-base font-semibold dark:text-white text-gray-900 line-clamp-2 flex-1 pr-4 whitespace-pre-wrap break-words">
                          {item.title}
                        </h3>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-2 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="移除收藏"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 dark:text-neutral-400 text-gray-500 hover:text-red-500" />
                          )}
                        </button>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs font-medium dark:text-cyan-400 text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-1 rounded">AI 回答</span>
                        </div>
                        <div className="text-sm dark:text-neutral-400 text-gray-600 max-h-[160px] overflow-y-auto whitespace-pre-wrap break-words pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {item.content}
                          </ReactMarkdown>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t dark:border-gray-800 border-gray-200">
                        <button
                          onClick={() => setActiveCard(item)}
                          className="flex items-center space-x-1 text-xs dark:text-cyan-400 text-cyan-600 hover:dark:text-cyan-300 hover:text-cyan-500 transition-colors"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>查看详情</span>
                        </button>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs dark:text-neutral-600 text-gray-400">{formatTime(item.timestamp)}</span>
                          <span className="dark:text-neutral-600 text-gray-400">·</span>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {activeCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 dark:bg-black/80 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setActiveCard(null)}
          ></div>
          <div className={`relative w-full max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'dark:bg-neutral-900 dark:border-gray-700' : 'bg-white border-gray-200'} border flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600"></div>
            
            <div className="p-6 border-b dark:border-gray-800 border-gray-200 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold dark:text-white text-gray-900 whitespace-pre-wrap break-words pr-8">
                  {activeCard.title}
                </h3>
                <p className="text-sm dark:text-neutral-500 text-gray-500 mt-1 flex items-center space-x-2">
                  <span>{formatTime(activeCard.timestamp)}</span>
                  <span>·</span>
                  <span className="flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span>已收藏</span>
                  </span>
                </p>
              </div>
              <button 
                onClick={() => setActiveCard(null)}
                className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5 dark:text-neutral-400 text-gray-500 hover:text-gray-700 dark:hover:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 prose dark:prose-invert max-w-none whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {activeCard.content}
              </ReactMarkdown>
            </div>

            <div className="p-4 border-t dark:border-gray-800 border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => handleDelete(activeCard.id)}
                disabled={deletingId === activeCard.id}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl dark:bg-red-900/20 bg-red-100 hover:dark:bg-red-900/30 hover:bg-red-200 dark:border border-red-500/30 border-red-300 text-red-600 transition-colors disabled:opacity-50"
              >
                {deletingId === activeCard.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">移除收藏</span>
              </button>
              <button
                onClick={() => setActiveCard(null)}
                className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-medium text-white transition-all shadow-lg shadow-cyan-500/25"
              >
                <span>关闭</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
