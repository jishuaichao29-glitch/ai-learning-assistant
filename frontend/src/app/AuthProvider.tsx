'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface User {
  id: number;
  username: string;
  created_at: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(null);
        }
      }
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    if (typeof window === 'undefined') {
      throw new Error('浏览器环境不可用');
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '登录失败');
      }

      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err) {
      console.error('登录网络错误:', err);
      throw err;
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    if (typeof window === 'undefined') {
      throw new Error('浏览器环境不可用');
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '注册失败');
      }

      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err) {
      console.error('注册网络错误:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
