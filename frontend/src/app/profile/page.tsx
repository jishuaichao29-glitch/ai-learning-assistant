'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';

interface TopicStat {
  name: string;
  value: number;
}

interface WeeklyActivity {
  date: string;
  count: number;
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

interface UserInfo {
  id: number;
  username: string;
  created_at: number;
  avatar: string | null;
}

export default function ProfileDashboard() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<StatsData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editUsernameError, setEditUsernameError] = useState('');
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { theme } = useTheme();
  const { token, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchStats = fetch('http://127.0.0.1:5000/api/stats', {
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
          throw new Error('未能成功连接到后端数据引擎');
        }
        return res.json();
      });

    const fetchUserProfile = fetch('http://127.0.0.1:5000/api/user/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
          return Promise.reject(new Error('登录已过期'));
        }
        return res.json();
      });

    const fetchUserStats = fetch('http://127.0.0.1:5000/api/user/stats', {
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

    Promise.all([fetchStats, fetchUserProfile, fetchUserStats])
      .then(([statsData, profileData, userStatsData]) => {
        setData(statsData);
        setUserStats(userStatsData);
        if (profileData.success) {
          setUser({
            id: profileData.id,
            username: profileData.username,
            created_at: profileData.created_at,
            avatar: profileData.avatar || null
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('数据加载网络错误:', err);
        setError(err.message || '数据加载失败');
        setLoading(false);
      });
  }, [token, mounted]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有密码字段');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('新密码长度至少6个字符');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/user/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      const resData = await response.json();

      if (resData.success) {
        setIsModalOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        logout();
        router.push('/login');
      } else {
        setPasswordError(resData.error || '修改失败，请重试');
      }
    } catch (err) {
      console.error('修改密码网络错误:', err);
      setPasswordError('网络错误，请检查连接');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBindFeature = () => {
    setToastMessage('为了保障您的数据安全，该商业化增值功能（短信/邮件认证网关）正在内测开发中，敬请期待！');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      router.push('/login');
    }
  };

  const handleCopyUID = () => {
    if (user) {
      const uid = `UID: ${10000 + user.id}`;
      navigator.clipboard.writeText(uid);
      setToastMessage('UID已复制到剪贴板');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleStartEditUsername = () => {
    setEditUsername(user?.username || '');
    setEditUsernameError('');
    setIsEditingUsername(true);
  };

  const handleCancelEditUsername = () => {
    setIsEditingUsername(false);
    setEditUsername('');
    setEditUsernameError('');
  };

  const handleSaveUsername = async () => {
    if (!editUsername.trim()) {
      setEditUsernameError('用户名不能为空');
      return;
    }

    if (editUsername.trim() === user?.username) {
      handleCancelEditUsername();
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: editUsername.trim() })
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      const resData = await response.json();

      if (resData.success) {
        setUser(prev => prev ? { ...prev, username: resData.username } : null);
        setIsEditingUsername(false);
        setEditUsername('');
        setToastMessage('用户名修改成功');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } else {
        setEditUsernameError(resData.error || '修改失败');
      }
    } catch (err) {
      console.error('修改用户名网络错误:', err);
      setEditUsernameError('网络错误，请检查连接');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      uploadAvatar(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (base64Data: string) => {
    setIsUploadingAvatar(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ avatar: base64Data })
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      const resData = await response.json();

      if (resData.success) {
        setUser(prev => prev ? { ...prev, avatar: resData.avatar } : null);
        setToastMessage('头像上传成功');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } else {
        setToastMessage(resData.error || '头像上传失败');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    } catch (err) {
      console.error('上传头像网络错误:', err);
      setToastMessage('网络错误，请检查连接');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getInitial = (username: string) => {
    return username ? username.charAt(0).toUpperCase() : 'U';
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 10000) {
      return (tokens / 10000).toFixed(1) + 'w';
    } else if (tokens >= 1000) {
      return (tokens / 1000).toFixed(1) + 'k';
    }
    return tokens.toString();
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const totalTopicCount = data?.topic_stats.reduce((sum, item) => sum + item.value, 0) || 1;

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center font-sans ${
        theme === 'dark' ? 'bg-black text-neutral-400' : 'bg-white text-gray-600'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
        <p className="text-sm tracking-widest text-cyan-500/80 animate-pulse">正在加载个人中心...</p>
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

      {showToast && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg backdrop-blur-md animate-bounce ${
          theme === 'dark' 
            ? 'bg-white/10 border border-white/20 text-white' 
            : 'bg-gray-900 text-white'
        }`}>
          {toastMessage}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

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
            个人中心
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
            <span>← 返回聊天</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8 relative z-10">
        
        <div className={`p-8 rounded-2xl backdrop-blur-md ${
          theme === 'dark' ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-gray-200 shadow-lg'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative">
              <div 
                onClick={handleAvatarClick}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold cursor-pointer transition-all duration-300 hover:scale-105 ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10' 
                    : 'bg-gradient-to-br from-cyan-100 to-purple-100 border border-gray-200'
                }`}
              >
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className={`${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    {getInitial(user?.username || '')}
                  </span>
                )}
              </div>
              <div className={`absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer ${
                theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
              }`} onClick={handleAvatarClick}>
                <span className="text-white text-xs font-medium">更换头像</span>
              </div>
              {isUploadingAvatar && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className={`px-3 py-2 rounded-lg outline-none transition ${
                        theme === 'dark' 
                          ? 'bg-neutral-900/80 border border-cyan-500 text-white' 
                          : 'bg-gray-50 border border-cyan-500 text-gray-900'
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveUsername}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        theme === 'dark' 
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEditUsername}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        theme === 'dark' 
                          ? 'bg-white/10 hover:bg-white/20 text-neutral-400' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user?.username || '加载中...'}
                    </h2>
                    <button
                      onClick={handleStartEditUsername}
                      className={`text-xs px-3 py-1 rounded-full transition ${
                        theme === 'dark' 
                          ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-neutral-300' 
                          : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      ✏️ 编辑
                    </button>
                  </>
                )}
              </div>
              
              {editUsernameError && (
                <p className={`text-xs text-red-400 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  ⚠️ {editUsernameError}
                </p>
              )}
              
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-mono ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                  UID: {user ? 10000 + user.id : '----'}
                </span>
                <button
                  onClick={handleCopyUID}
                  className={`text-xs px-2 py-1 rounded-lg transition hover:scale-105 ${
                    theme === 'dark' 
                      ? 'bg-white/5 hover:bg-white/10 text-neutral-500 hover:text-neutral-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📋
                </button>
              </div>
              
              <div className={`text-sm ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
                <span className="mr-2">📅</span>
                注册于 {user ? formatDate(user.created_at) : '加载中...'}
              </div>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl backdrop-blur-md ${
          theme === 'dark' ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className={`border-b pb-4 mb-4 ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
            <p className={`text-xs font-medium uppercase tracking-widest ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
              Security Settings / 账号与安全
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200/50">
              <div className="flex items-center space-x-3">
                <span className="text-lg">🔐</span>
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-neutral-200' : 'text-gray-800'}`}>登录密码</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>已设置保障中</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                  theme === 'dark' 
                    ? 'bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400' 
                    : 'bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 text-cyan-700'
                }`}
              >
                修改密码
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200/50">
              <div className="flex items-center space-x-3">
                <span className="text-lg">📧</span>
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-neutral-200' : 'text-gray-800'}`}>电子邮箱</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>未绑定</p>
                </div>
              </div>
              <button
                onClick={handleBindFeature}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                  theme === 'dark' 
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400' 
                    : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500'
                }`}
              >
                去绑定
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-3">
                <span className="text-lg">📱</span>
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-neutral-200' : 'text-gray-800'}`}>手机号码</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>未绑定</p>
                </div>
              </div>
              <button
                onClick={handleBindFeature}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                  theme === 'dark' 
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400' 
                    : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500'
                }`}
              >
                去绑定
              </button>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl backdrop-blur-md ${
          theme === 'dark' ? 'bg-red-900/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>退出登录</p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                点击后将清除本地登录状态并返回登录页面
              </p>
            </div>
            <button
              onClick={handleLogout}
              className={`px-6 py-2.5 rounded-xl font-medium transition flex items-center space-x-2 ${
                theme === 'dark' 
                  ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400' 
                  : 'bg-red-100 hover:bg-red-200 border border-red-300 text-red-600'
              }`}
            >
              <span>🚪</span>
              <span>退出登录</span>
            </button>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setIsModalOpen(false);
                setPasswordError('');
              }}
            ></div>
            <div className={`relative w-full max-w-md mx-4 p-6 rounded-2xl backdrop-blur-md ${
              theme === 'dark' ? 'bg-neutral-900/90 border border-white/10' : 'bg-white/95 border border-gray-200 shadow-2xl'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  修改登录密码
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setPasswordError('');
                  }}
                  className={`text-neutral-400 hover:text-neutral-200 transition ${theme === 'dark' ? 'text-neutral-400' : 'text-gray-400'}`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <label className={`text-xs font-medium ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>原密码</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl outline-none transition ${
                      theme === 'dark' 
                        ? 'bg-neutral-800/80 border border-white/10 focus:border-cyan-500 text-white placeholder-neutral-500' 
                        : 'bg-gray-50 border border-gray-200 focus:border-cyan-500 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="请输入原密码"
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-medium ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>新密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl outline-none transition ${
                      theme === 'dark' 
                        ? 'bg-neutral-800/80 border border-white/10 focus:border-cyan-500 text-white placeholder-neutral-500' 
                        : 'bg-gray-50 border border-gray-200 focus:border-cyan-500 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="请输入新密码（至少6个字符）"
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-medium ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>确认新密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl outline-none transition ${
                      theme === 'dark' 
                        ? 'bg-neutral-800/80 border border-white/10 focus:border-cyan-500 text-white placeholder-neutral-500' 
                        : 'bg-gray-50 border border-gray-200 focus:border-cyan-500 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="请再次输入新密码"
                  />
                </div>

                {passwordError && (
                  <div className={`p-3 rounded-xl text-sm ${
                    theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'
                  }`}>
                    ⚠️ {passwordError}
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setPasswordError('');
                    }}
                    className={`flex-1 py-3 rounded-xl font-medium transition ${
                      theme === 'dark' 
                        ? 'bg-white/10 hover:bg-white/20 text-neutral-300' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 py-3 rounded-xl font-medium transition flex items-center justify-center ${
                      theme === 'dark' 
                        ? 'bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-700 text-white' 
                        : 'bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-200 text-white'
                    }`}
                  >
                    {isSubmitting ? '处理中...' : '确认修改'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
            </>
          )}
        </div>

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
                {data?.total_chats || 0}
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
                {(data?.ai_words || 0).toLocaleString()}
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

        <footer className={`text-center text-[10px] tracking-widest pt-4 ${
          theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'
        }`}>
          ACCOUNT CENTER v1.0 • SECURE AUTHENTICATION
        </footer>
      </main>
    </div>
    </ProtectedRoute>
  );
}
