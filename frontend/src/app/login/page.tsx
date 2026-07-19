'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthProvider';
import { useTheme } from '../ThemeProvider';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('用户名和密码不能为空');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('密码长度至少6个字符');
      return;
    }

    if (username.length < 3 || username.length > 50) {
      setError('用户名长度必须在3-50个字符之间');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
      
      router.push('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl backdrop-blur-md p-8 relative ${theme === 'dark' ? 'bg-black/40 border border-white/10' : 'bg-white/80 border border-gray-200 shadow-xl'}`}>
        <div className="flex items-center justify-center mb-6">
          <Link
            href="/"
            className={`absolute left-6 top-6 text-sm transition-colors flex items-center space-x-1 ${
              theme === 'dark' ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>←</span>
            <span>返回首页</span>
          </Link>
        </div>
        <div className="text-center mb-8">
          <div className={`text-5xl mb-4 ${theme === 'dark' ? 'text-cyan-400' : 'text-purple-600'}`}>🤖</div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {isLogin ? '欢迎回来' : '创建账号'}
          </h1>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
            {isLogin ? '登录你的 AI 学习助手' : '开启你的学习之旅'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl outline-none transition-colors ${
                theme === 'dark'
                  ? 'bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:border-cyan-500 focus:bg-white/10'
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:bg-white'
              }`}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl outline-none transition-colors ${
                theme === 'dark'
                  ? 'bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:border-cyan-500 focus:bg-white/10'
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:bg-white'
              }`}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>

          {!isLogin && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl outline-none transition-colors ${
                  theme === 'dark'
                    ? 'bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:border-cyan-500 focus:bg-white/10'
                    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:bg-white'
                }`}
                placeholder="请再次输入密码"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className={`p-3 rounded-xl text-sm ${theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              theme === 'dark'
                ? 'bg-cyan-500 hover:bg-cyan-400 text-white disabled:bg-cyan-500/50'
                : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-600/50'
            }`}
          >
            {isLoading ? '请稍候...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        <div className={`mt-6 text-center ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setConfirmPassword('');
            }}
            className={`ml-1 text-sm font-medium underline ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-purple-600 hover:text-purple-700'}`}
          >
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </div>
      </div>
    </div>
  );
}
