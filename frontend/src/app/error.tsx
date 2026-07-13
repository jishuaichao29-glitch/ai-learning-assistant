'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-950 text-white">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold mb-4">页面出现问题</h1>
        <p className="text-neutral-400 mb-8">
          {error.message || '抱歉，页面发生了未知错误'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
