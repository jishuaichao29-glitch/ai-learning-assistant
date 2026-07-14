'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem('token');
    setHasToken(!!savedToken);
    
    if (savedToken) {
      setIsChecking(false);
      setHasRedirected(false);
    } else if (isAuthenticated) {
      setIsChecking(false);
      setHasRedirected(false);
    } else if (!hasRedirected) {
      const timer = setTimeout(() => {
        setIsChecking(false);
        setHasRedirected(true);
        router.push('/login');
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, router, hasRedirected]);

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
