import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-white relative overflow-hidden">
      {/* 科技风背景光晕 */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="z-10 text-center space-y-8">
        <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
          AI 智能学习助手
        </h1>
        <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          全栈工程化实训演示项目。探索知识，记录成长，用 AI 赋能你的学习旅程。
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-12">
          {/* 去聊天室的按钮 */}
          <Link 
            href="/chat"
            className="px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]"
          >
            开始体验对话
          </Link>

          {/* 新增：去看板的按钮 */}
          <Link 
            href="/profile"
            className="px-8 py-4 rounded-full backdrop-blur-md bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 hover:border-cyan-500/50 transition-all flex items-center space-x-2"
          >
            <span>📊</span>
            <span>查看学情大屏</span>
          </Link>
        </div>
      </div>
    </main>
  );
}