'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, token, logout } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem('token');
    
    if (!savedToken) {
      setHasToken(false);
      const timer = setTimeout(() => {
        setIsChecking(false);
        router.push('/login');
      }, 100);
      return () => clearTimeout(timer);
    }

    setHasToken(true);

    const validateToken = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/user/info', {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        
        if (!response.ok) {
          logout();
          setHasToken(false);
          setIsChecking(false);
          router.push('/login');
        } else {
          setIsChecking(false);
        }
      } catch {
        logout();
        setHasToken(false);
        setIsChecking(false);
        router.push('/login');
      }
    };

    validateToken();
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!isAuthenticated && !hasToken) {
    return null;
  }

  return <>{children}</>;
}
