import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white flex flex-col justify-between">
      {/* 顶部导航栏 */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-800 backdrop-blur-md bg-black/30 sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            AI.Study
          </span>
        </div>
        <nav className="space-x-6 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition">功能特性</a>
          <a href="#about" className="hover:text-white transition">关于项目</a>
        </nav>
      </header>

      {/* Hero 核心主视觉区 */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 text-center max-w-4xl mx-auto my-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-400 mb-6 animate-pulse">
          ✨ 新一代 AI 智能全栈实训项目
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
          用 AI 重塑你的 <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
            学习与编程体验
          </span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          基于 Next.js 与 Flask 构建的智能学习助手。支持实时 AI 对话、历史记录管理与工程化数据分析，助你轻松跑通全流程。[cite: 11, 18]
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm">
          <Link href="/chat" className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 transition transform hover:-translate-y-0.5 active:translate-y-0 text-center">
            立即开启对话
          </Link>
        </div>

        {/* 特性介绍三驾马车 */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
          <div className="p-6 rounded-2xl border border-gray-800 bg-gray-950/50 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold mb-4">💬</div>
            <h3 className="text-lg font-semibold mb-2">智能对话模块</h3>
            <p className="text-gray-400 text-sm">对接大语言模型，提供秒级响应的智能问答与代码辅助服务。</p>
          </div>
          <div className="p-6 rounded-2xl border border-gray-800 bg-gray-950/50 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold mb-4">📁</div>
            <h3 className="text-lg font-semibold mb-2">历史记录留痕</h3>
            <p className="text-gray-400 text-sm">自动持久化存储对话上下文，随时复盘你的思考与学习轨迹。[cite: 5, 11]</p>
          </div>
          <div className="p-6 rounded-2xl border border-gray-800 bg-gray-950/50 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 font-bold mb-4">🛠️</div>
            <h3 className="text-lg font-semibold mb-2">规范工程化</h3>
            <p className="text-gray-400 text-sm">严格遵循前后端分离架构，组件化开发，具备标准日志留痕。[cite: 3, 5]</p>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="py-6 text-center text-sm text-gray-600 border-t border-gray-900">
        © 2026 AI.Study Assistant. Built with Next.js & Flask.[cite: 18]
      </footer>
    </div>
  );
}