import React, { useState } from 'react';
import { SAMPLE_ARTICLES } from '../data/samples';
import {
  Sparkles,
  Trash2,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { ApiConfig, pingFlaskApi } from '../utils/apiService';
import { soundFx } from '../utils/soundEffects';

interface HeroInputSectionProps {
  headline: string;
  setHeadline: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  onAnalyze: (customHead?: string, customBody?: string) => void;
  onQuickLoadSample: (sampleId: string) => void;
  isAnalyzing: boolean;
  apiConfig: ApiConfig;
  setApiConfig: React.Dispatch<React.SetStateAction<ApiConfig>>;
}

export const HeroInputSection: React.FC<HeroInputSectionProps> = ({
  headline,
  setHeadline,
  content,
  setContent,
  onAnalyze,
  onQuickLoadSample,
  isAnalyzing,
  apiConfig,
  setApiConfig,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [pingStatus, setPingStatus] = useState<{
    testing: boolean;
    result: null | { success: boolean; latencyMs: number; message: string };
  }>({
    testing: false,
    result: null,
  });

  const fullText = (headline + ' ' + content).trim();
  const wordCount = fullText ? (fullText.match(/\b\S+\b/g) || []).length : 0;
  const charCount = fullText.length;
  const headlineWords = headline.trim()
    ? (headline.trim().match(/\b\S+\b/g) || []).length
    : 0;

  const handleClear = () => {
    soundFx.playClick(420);
    setHeadline('');
    setContent('');
  };

  const handleInjectPhrase = (type: 'clickbait' | 'institutional') => {
    soundFx.playClick(type === 'institutional' ? 760 : 340);
    const nextContent =
      type === 'clickbait'
        ? `${content.trim()} SHOCKING SECRET: You won't believe this miracle cure that Big Pharma is hiding overnight!!!`.trim()
        : `${content.trim()} According to official quarterly data published by university researchers and confirmed by the ministry spokesperson, the baseline rate changed by 1.8 percent.`.trim();
    setContent(nextContent);
    onAnalyze(headline, nextContent);
  };

  const handleTestConnection = async () => {
    setPingStatus({ testing: true, result: null });
    const res = await pingFlaskApi(apiConfig.endpoint);
    setPingStatus({ testing: false, result: res });
  };

  return (
    <section id="verifier-input" className="w-full pt-10 pb-10">
      {/* Editorial Title & Unboxed Kicker */}
      <div className="mb-8 text-center max-w-3xl mx-auto">
        <div className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2">
          Forensic Media Analysis Workbench · Interactive NLP Sandbox
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif] text-balance">
          FAKE AI Credibility &amp; Emotion Scanner
        </h1>
        <p className="mt-3 text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Evaluate editorial credibility using a 3-model machine learning ensemble,
          measure sensationalist clickbait risk, and neutralize manipulative phrasing in real time.
        </p>
      </div>

      {/* Main Input Box */}
      <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-5 md:p-7 shadow-xl shadow-black/40 relative">
        {/* Quick Sample Selector Bar */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Quick-Load Forensic Samples
            </span>
            <span className="text-[11px] text-slate-500">
              Select a benchmark to auto-fill and synchronize with the 3D Gyroscope:
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SAMPLE_ARTICLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  soundFx.playVerdict(sample.expectedVerdict === 'REAL');
                  onQuickLoadSample(sample.id);
                }}
                className="group text-left px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-sm"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span
                    className={
                      sample.expectedVerdict === 'REAL'
                        ? 'text-emerald-400 font-semibold'
                        : sample.expectedVerdict === 'FAKE'
                        ? 'text-rose-400 font-semibold'
                        : 'text-amber-400 font-semibold'
                    }
                  >
                    {sample.typeBadge}
                  </span>
                  <span className="text-slate-500 group-hover:text-blue-400 transition-colors">
                    Run →
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-200 line-clamp-1 group-hover:text-white transition-colors">
                  {sample.label.replace('Load ', '')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Inputs Container */}
        <div className="space-y-4">
          {/* Headline Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label
                htmlFor="headline-input"
                className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono"
              >
                News Headline
              </label>
              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                {headlineWords} words · {headline.length} chars
              </span>
            </div>
            <input
              id="headline-input"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Central Bank Announces New Interest Policy OR Shocking Miracle Cure Revealed..."
              className="w-full bg-[#0B0F19] border border-slate-700/80 rounded-xl px-4 py-3 text-sm md:text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
            />
          </div>

          {/* Article Body Textarea */}
          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
              <label
                htmlFor="body-input"
                className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono"
              >
                Article Body Text
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInjectPhrase('clickbait')}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                  title="Append a sensationalist clickbait sentence and re-evaluate immediately"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Inject Clickbait Phrase</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInjectPhrase('institutional')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/50 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                  title="Append an institutional factual statement and re-evaluate immediately"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Inject Factual Citation</span>
                </button>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {wordCount} words · {charCount} chars · ~{Math.max(1, Math.round((wordCount / 200) * 60))}s read
                </span>
              </div>
            </div>
            <textarea
              id="body-input"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the full article content, press release, or journalistic excerpt here to examine linguistic bias, emotional subjectivity, and institutional markers..."
              className="w-full bg-[#0B0F19] border border-slate-700/80 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-normal leading-relaxed resize-y min-h-[120px]"
            />
          </div>
        </div>

        {/* Action Controls & API Configuration Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={!headline && !content}
              className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              title="Clear input fields"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            {/* Toggle Engine Settings */}
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Engine: {apiConfig.mode === 'client' ? 'Client ML' : 'Flask API'}</span>
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick(640);
                onAnalyze(headline, content);
              }}
              disabled={isAnalyzing || (!headline.trim() && !content.trim())}
              className="w-full md:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-semibold text-sm tracking-wide shadow-lg shadow-indigo-950/60 hover:shadow-indigo-900/40 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Forensic Scores...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Credibility &amp; Emotion</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Engine Configuration Drawer (if toggled) */}
        {showConfig && (
          <div className="mt-4 p-4 rounded-xl bg-[#0B0F19] border border-slate-700/80 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono">
                Inference Engine Mode
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApiConfig((c) => ({ ...c, mode: 'client' }))}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    apiConfig.mode === 'client'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Client-Side ML (Instant)
                </button>
                <button
                  type="button"
                  onClick={() => setApiConfig((c) => ({ ...c, mode: 'flask' }))}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    apiConfig.mode === 'flask'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Python Flask Server
                </button>
              </div>
            </div>

            {apiConfig.mode === 'flask' && (
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={apiConfig.endpoint}
                  onChange={(e) => setApiConfig((c) => ({ ...c, endpoint: e.target.value }))}
                  placeholder="http://localhost:5000/predict"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={pingStatus.testing}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {pingStatus.testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                  <span>Test Connection</span>
                </button>
              </div>
            )}

            {pingStatus.result && (
              <div
                className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-mono ${
                  pingStatus.result.success
                    ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                    : 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                }`}
              >
                {pingStatus.result.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>
                  {pingStatus.result.message}{' '}
                  {pingStatus.result.success ? `(${pingStatus.result.latencyMs}ms)` : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
