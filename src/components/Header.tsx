import React from 'react';
import { ShieldCheck, Code2, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenProjectCode: () => void;
  onScrollToSection: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProjectCode, onScrollToSection }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-950/50 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap font-['Plus_Jakarta_Sans',sans-serif]">
              fake<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI</span>
            </span>
          </a>
        </div>

        {/* Zone 2: 4 Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
          <button
            onClick={() => onScrollToSection('verifier-input')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Forensic Scanner
          </button>
          <button
            onClick={() => onScrollToSection('ensemble-dashboard')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            ML Ensemble
          </button>
          <button
            onClick={() => onScrollToSection('emotion-meter')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Clickbait &amp; Emotion
          </button>
          <button
            onClick={() => onScrollToSection('xai-highlighter')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Explainable AI
          </button>
          <button
            onClick={() => onScrollToSection('verification-history')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Verification Log
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenProjectCode}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer whitespace-nowrap shrink-0 hover:border-indigo-400/50"
            title="View Flask + Scikit-Learn Python project files"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Project Files &amp; API</span>
          </button>
        </div>
      </div>
    </header>
  );
};
