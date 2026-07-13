'use client';

import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';

export default function Home() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden font-sans ${
      theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'
    }`}>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] dark:bg-purple-900/20 bg-purple-200/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] dark:bg-cyan-900/20 bg-cyan-200/30 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="z-10 text-center space-y-8">
        <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
          AI 智能学习助手
        </h1>
        <p className={`text-xl max-w-2xl mx-auto leading-relaxed ${
          theme === 'dark' ? 'text-neutral-400' : 'text-gray-600'
        }`}>
          全栈工程化实训演示项目。探索知识，记录成长，用 AI 赋能你的学习旅程。
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-12">
          {isAuthenticated ? (
            <>
              <Link 
                href="/chat"
                className="px-8 py-4 rounded-full bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]"
              >
                开始体验对话
              </Link>

              <Link 
                href="/profile"
                className={`px-8 py-4 rounded-full backdrop-blur-md font-semibold transition-all flex items-center space-x-2 ${
                  theme === 'dark' 
                    ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-cyan-500/50' 
                    : 'bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-200 hover:border-cyan-300'
                }`}
              >
                <span>📊</span>
                <span>查看学情大屏</span>
              </Link>
            </>
          ) : (
            <Link 
              href="/login"
              className="px-8 py-4 rounded-full bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]"
            >
              登录 / 注册
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
