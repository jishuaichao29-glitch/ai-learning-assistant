'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MathAccordionProps {
  content: string;
}

function containsMathFormulas(content: string): boolean {
  const mathPattern = /\$\$[\s\S]*?\$\$|\$[^$]+\$/g;
  const matches = content.match(mathPattern);
  return matches ? matches.length >= 2 : false;
}

function extractMathSections(content: string): { nonMath: string[]; math: string[] } {
  const mathPattern = /(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g;
  const parts = content.split(mathPattern);
  
  const nonMath: string[] = [];
  const math: string[] = [];
  
  parts.forEach((part) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      math.push(part);
    } else if (part.trim()) {
      nonMath.push(part);
    }
  });
  
  return { nonMath, math };
}

function formatSymbolGrid(mathSymbols: string[]): string {
  if (mathSymbols.length === 0) return '';
  
  const columns = Math.min(2, Math.ceil(mathSymbols.length / 4));
  const rows = Math.ceil(mathSymbols.length / columns);
  
  let grid = '\n\n|';
  for (let i = 0; i < columns; i++) {
    grid += ' 符号 |';
  }
  grid += '\n|';
  for (let i = 0; i < columns; i++) {
    grid += ' ---- |';
  }
  
  for (let r = 0; r < rows; r++) {
    grid += '\n|';
    for (let c = 0; c < columns; c++) {
      const idx = r * columns + c;
      if (idx < mathSymbols.length) {
        grid += ` ${mathSymbols[idx]} |`;
      } else {
        grid += ' |';
      }
    }
  }
  
  return grid;
}

export default function MathAccordion({ content }: MathAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMath = containsMathFormulas(content);
  
  if (!hasMath) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    );
  }
  
  const { nonMath, math } = extractMathSections(content);
  const visibleContent = nonMath.join('\n\n');
  const mathContent = math.join('\n\n');
  const symbolGrid = formatSymbolGrid(math.filter(m => m.startsWith('$') && !m.startsWith('$$')));
  
  return (
    <div className="space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {visibleContent}
      </ReactMarkdown>
      
      <div className={`border rounded-xl overflow-hidden transition-all duration-300 ease-out ${
        'dark:border-gray-700 border-gray-200'
      }`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-800/30 dark:hover:to-purple-800/30 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span className="text-xl">🧠</span>
            <span className="text-sm font-medium dark:text-indigo-300 text-indigo-700">
              检测到硬核数学推导
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 text-indigo-600">
              {math.length} 个公式
            </span>
          </div>
          <span className={`text-xs font-medium transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          } dark:text-neutral-400 text-gray-500`}>
            ▼
          </span>
        </button>
        
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="p-4 bg-white dark:bg-neutral-900 border-t dark:border-gray-700 border-gray-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {mathContent + symbolGrid}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}