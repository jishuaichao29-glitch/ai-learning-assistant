'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '../ThemeProvider';
import { useAuth } from '../AuthProvider';
import ProtectedRoute from '../ProtectedRoute';



interface UserInfo {
  id: number;
  username: string;
  created_at: number;
  avatar: string | null;
}

export default function ProfileDashboard() {
  const [mounted, setMounted] = useState(false);
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
  
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>('system');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const { theme } = useTheme();
  const { token, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    fetch('https://ai-learning-assistant-6hw0.onrender.com/api/user/profile', {
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
      })
      .then((profileData) => {
        if (profileData.success) {
          setUser({
            id: profileData.id,
            username: profileData.username,
            created_at: profileData.created_at,
            avatar: profileData.avatar || null
          });
        }
      })
      .catch((err) => {
        console.error('数据加载网络错误:', err);
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
      const response = await fetch('https://ai-learning-assistant-6hw0.onrender.com/api/user/change-password', {
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
      const response = await fetch('https://ai-learning-assistant-6hw0.onrender.com/api/user/profile', {
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
      const response = await fetch('https://ai-learning-assistant-6hw0.onrender.com/api/user/profile', {
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

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('https://ai-learning-assistant-6hw0.onrender.com/api/user/export', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      const resData = await response.json();
      if (resData.success) {
        const jsonData = JSON.stringify(resData.data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_chat_history.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setToastMessage('聊天记录导出成功');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } else {
        setToastMessage(resData.error || '导出失败');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    } catch (err) {
      console.error('导出数据网络错误:', err);
      setToastMessage('网络错误，请检查连接');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('https://ai-learning-assistant-6hw0.onrender.com/api/user/account', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      const resData = await response.json();
      if (resData.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsDeleteModalOpen(false);
        router.push('/login');
      } else {
        setToastMessage(resData.error || '注销失败');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    } catch (err) {
      console.error('注销账号网络错误:', err);
      setToastMessage('网络错误，请检查连接');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
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

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
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

        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsDeleteModalOpen(false)}
            ></div>
            <div className={`relative w-full max-w-md mx-4 p-6 rounded-2xl backdrop-blur-md border-red-500/30 ${
              theme === 'dark' ? 'bg-red-900/80' : 'bg-red-50'
            }`}>
              <div className="flex items-center justify-center mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
                }`}>
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-center text-red-500 mb-2">
                危险操作警告
              </h3>
              <p className={`text-sm text-center mb-6 ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>
                此操作不可逆，将永久删除您的账号及所有聊天记录！
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className={`flex-1 py-3 rounded-xl font-medium transition ${
                    theme === 'dark' 
                      ? 'bg-white/10 hover:bg-white/20 text-neutral-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 rounded-xl font-medium bg-red-500 hover:bg-red-600 text-white transition"
                >
                  确认注销
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`p-6 rounded-2xl backdrop-blur-md transition-all duration-300 ${
          theme === 'dark' ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className={`border-b pb-4 mb-4 ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
            <p className={`text-xs font-medium uppercase tracking-widest ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
              Preferences / 偏好设置
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>外观主题</span>
              <div className="flex gap-2">
                {(['system', 'light', 'dark'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setThemePreference(option)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      themePreference === option
                        ? 'bg-cyan-500 text-white'
                        : theme === 'dark'
                          ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option === 'system' ? '跟随系统' : option === 'light' ? '亮色' : '暗色'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>数据主权</span>
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isExporting ? '导出中...' : '导出全部聊天记录 (JSON)'}
              </button>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl backdrop-blur-md border-red-500/30 transition-all duration-300 ${
          theme === 'dark' ? 'bg-red-900/10' : 'bg-red-50'
        }`}>
          <div className={`border-b pb-4 mb-4 ${theme === 'dark' ? 'border-red-500/20' : 'border-red-200'}`}>
            <p className="text-xs font-medium uppercase tracking-widest text-red-500">
              Danger Zone / 危险操作区
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={logout}
              className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
            >
              安全退出登录
            </button>
            
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-all"
            >
              彻底注销账号
            </button>
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
