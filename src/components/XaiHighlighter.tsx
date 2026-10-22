import React, { useState } from 'react';
import { FeatureImpact } from '../types';
import { CLICKBAIT_TRIGGERS, INSTITUTIONAL_MARKERS } from '../utils/nlpEngine';
import { soundFx } from '../utils/soundEffects';
import { Eye, BarChart3, Wand2, Sparkles } from 'lucide-react';

interface XaiHighlighterProps {
  headline: string;
  content: string;
  featureImpacts: FeatureImpact[];
  onNeutralizeToken: (token: string) => void;
  onNeutralizeAll: () => void;
}

export const XaiHighlighter: React.FC<XaiHighlighterProps> = ({
  headline,
  content,
  featureImpacts,
  onNeutralizeToken,
  onNeutralizeAll,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'fake' | 'real' | 'none'>('all');
  const [neutralizedCount, setNeutralizedCount] = useState(0);

  const fullText = (headline ? headline + '\n\n' : '') + content;

  const handleTokenClick = (token: string) => {
    soundFx.playNeutralizeWord();
    setNeutralizedCount((c) => c + 1);
    onNeutralizeToken(token);
  };

  const handleRewriteAll = () => {
    soundFx.playVerdict(true);
    setNeutralizedCount((c) => c + 5);
    onNeutralizeAll();
  };

  // Build highlighted interactive tokens
  const renderHighlightedContent = () => {
    if (!fullText.trim()) {
      return <p className="text-slate-500 italic">No text provided for analysis.</p>;
    }

    if (activeFilter === 'none') {
      return (
        <div className="whitespace-pre-wrap leading-relaxed text-slate-300 font-normal">
          {fullText}
        </div>
      );
    }

    const tokens = fullText.split(/(\s+|[.,!?;:"'()[\]{}]+)/g);

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-slate-300 font-normal text-sm md:text-base">
        {tokens.map((token, idx) => {
          if (!token) return null;

          const trimmed = token.trim();
          const lower = trimmed.toLowerCase();

          const isTrigger = CLICKBAIT_TRIGGERS[lower] !== undefined;
          const isAllCaps =
            trimmed.length >= 2 &&
            /^[A-Z]+$/.test(trimmed) &&
            !['I', 'A', 'OK', 'NASA', 'USA', 'UK', 'EU', 'UN', 'CEO', 'FBI', 'AI'].includes(trimmed);
          const isExcessivePunct =
            /^[!?]{1,}$/.test(trimmed) && (token.includes('!') || token.includes('?'));
          const isInstitutional = INSTITUTIONAL_MARKERS[lower] !== undefined;

          if (isTrigger && (activeFilter === 'all' || activeFilter === 'fake')) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleTokenClick(trimmed)}
                className="bg-rose-950/80 hover:bg-emerald-950/90 text-rose-300 hover:text-emerald-300 border border-rose-700/70 hover:border-emerald-600 px-1.5 py-0.5 rounded font-medium text-xs md:text-sm mx-0.5 shadow-sm inline-flex items-center gap-1 transition-colors cursor-pointer group"
                title={`Click to neutralize trigger "${trimmed}" (-${CLICKBAIT_TRIGGERS[lower]} impact)`}
              >
                <span>{token}</span>
                <span className="text-[10px] opacity-70 group-hover:opacity-100">×</span>
              </button>
            );
          }

          if (isAllCaps && (activeFilter === 'all' || activeFilter === 'fake')) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleTokenClick(trimmed)}
                className="bg-amber-950/80 hover:bg-emerald-950/90 text-amber-300 hover:text-emerald-300 border border-amber-700/70 hover:border-emerald-600 px-1.5 py-0.5 rounded font-mono font-semibold text-xs md:text-sm mx-0.5 shadow-sm inline-flex items-center gap-1 transition-colors cursor-pointer group"
                title={`Click to convert shouting ALL-CAPS "${trimmed}" to calm case`}
              >
                <span>{token}</span>
                <span className="text-[10px] opacity-70 group-hover:opacity-100">↓</span>
              </button>
            );
          }

          if (isExcessivePunct && (activeFilter === 'all' || activeFilter === 'fake')) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleTokenClick(trimmed)}
                className="bg-rose-950/80 hover:bg-slate-800 text-rose-400 hover:text-slate-200 font-black px-1.5 rounded mx-0.5 inline-block transition-colors cursor-pointer"
                title="Click to normalize sensationalist punctuation"
              >
                {token}
              </button>
            );
          }

          if (isInstitutional && (activeFilter === 'all' || activeFilter === 'real')) {
            return (
              <mark
                key={idx}
                className="bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded font-medium text-xs md:text-sm mx-0.5 shadow-sm inline-block"
                title={`Institutional Credibility Term (+${INSTITUTIONAL_MARKERS[lower]} impact)`}
              >
                {token}
              </mark>
            );
          }

          return <span key={idx}>{token}</span>;
        })}
      </div>
    );
  };

  const maxAbsScore = Math.max(1, ...featureImpacts.map((f) => Math.abs(f.score)));

  return (
    <section id="xai-highlighter" className="w-full mt-10">
      <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-xl shadow-black/40">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Eye className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Interactive Explainable AI (XAI) De-Sensationalizer
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Click any <span className="text-rose-400 font-semibold">Red</span> or{' '}
              <span className="text-amber-400 font-semibold">Amber</span> badge in the article below to neutralize manipulative phrasing and watch the 3-Model Ensemble &amp; 3D Gyroscope recalculate live.
            </p>
          </div>

          {/* Right Controls: Auto-Neutralize + Filter Segmented Control */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRewriteAll}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              title="Automatically replace all clickbait triggers and shouting caps with neutral journalistic phrasing"
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Neutralize All Sensationalism</span>
            </button>

            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Highlight All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('fake')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeFilter === 'fake' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Triggers
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('real')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeFilter === 'real' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Factual
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('none')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeFilter === 'none' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Plain
              </button>
            </div>
          </div>
        </div>

        {/* Legend & Live Interactive Counter */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400 mb-5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-slate-300">Interactive Legend:</span>
            <span className="text-rose-400">[Click Red Badge = Neutralize Trigger]</span>
            <span className="text-amber-400">[Click Amber Badge = Lowercase ALL-CAPS]</span>
            <span className="text-emerald-400">[Green = Verified Institutional Marker]</span>
          </div>
          {neutralizedCount > 0 && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1 tabular-nums">
              <Sparkles className="w-3.5 h-3.5" />
              {neutralizedCount} Sensationalist Tokens Neutralized
            </span>
          )}
        </div>

        {/* Highlighted Article Viewer */}
        <div className="p-5 md:p-6 rounded-xl bg-[#0B0F19] border border-slate-800/80 max-h-96 overflow-y-auto mb-8 font-sans">
          {renderHighlightedContent()}
        </div>

        {/* Horizontal Diverging Bar Chart */}
        <div className="pt-6 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
                Feature Impact Divergence (SHAP / TF-IDF Weights)
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-rose-400">← Pushing Toward FAKE (Click bar to neutralize)</span>
              <span className="text-emerald-400">Pushing Toward REAL →</span>
            </div>
          </div>

          {featureImpacts.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 font-mono">
              No strong divergent keyword features identified in current excerpt.
            </div>
          ) : (
            <div className="space-y-2.5 max-w-4xl mx-auto">
              {featureImpacts.map((feature, i) => {
                const isFakeLeaning = feature.score < 0;
                const absScore = Math.abs(feature.score);
                const widthPct = Math.min(100, (absScore / maxAbsScore) * 100);

                return (
                  <div key={i} className="flex items-center text-xs font-mono">
                    {/* Left Side: Fake Bar */}
                    <div className="w-1/2 flex items-center justify-end pr-3">
                      {isFakeLeaning ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (feature.category === 'fake_trigger') {
                              handleTokenClick(feature.word);
                            } else {
                              handleRewriteAll();
                            }
                          }}
                          className="flex items-center justify-end gap-2 w-full group cursor-pointer"
                          title={`Click to neutralize "${feature.word}"`}
                        >
                          <span className="font-semibold text-rose-300 group-hover:text-emerald-300 truncate text-[11px] transition-colors">
                            {feature.word}
                          </span>
                          <div
                            className="h-5 bg-rose-500/85 group-hover:bg-emerald-600 rounded-l transition-all duration-500 flex items-center px-1.5 justify-end"
                            style={{ width: `${Math.max(20, widthPct)}%` }}
                          >
                            <span className="text-[10px] text-white font-bold tabular-nums">
                              {feature.score}
                            </span>
                          </div>
                        </button>
                      ) : null}
                    </div>

                    {/* Center Zero Axis Divider */}
                    <div className="w-1 bg-slate-700 h-6 shrink-0 relative">
                      <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-1 bg-slate-500 rounded" />
                    </div>

                    {/* Right Side: Real Bar */}
                    <div className="w-1/2 flex items-center justify-start pl-3">
                      {!isFakeLeaning ? (
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className="h-5 bg-emerald-500/85 rounded-r transition-all duration-500 flex items-center px-1.5"
                            style={{ width: `${Math.max(20, widthPct)}%` }}
                          >
                            <span className="text-[10px] text-white font-bold tabular-nums">
                              +{feature.score}
                            </span>
                          </div>
                          <span className="font-semibold text-emerald-300 truncate text-[11px]">
                            {feature.word}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
