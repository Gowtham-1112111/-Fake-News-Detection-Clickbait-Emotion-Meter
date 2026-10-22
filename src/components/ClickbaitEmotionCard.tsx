import React from 'react';
import { MetricBreakdown } from '../types';
import { Flame, HeartPulse, Gauge, AlertTriangle, MessageSquareQuote } from 'lucide-react';

interface ClickbaitEmotionCardProps {
  metrics: MetricBreakdown;
}

export const ClickbaitEmotionCard: React.FC<ClickbaitEmotionCardProps> = ({ metrics }) => {
  // Semi-circle gauge math
  const radius = 68;
  const strokeWidth = 10;
  const arcLength = Math.PI * radius; // ~213.6
  const fillLength = (metrics.clickbaitScore / 100) * arcLength;
  const dashOffset = arcLength - fillLength;

  // Gauge color based on risk tier
  let gaugeColor = '#10B981'; // Emerald
  if (metrics.clickbaitScore >= 75) gaugeColor = '#EF4444'; // Crimson Red
  else if (metrics.clickbaitScore >= 50) gaugeColor = '#F97316'; // Orange
  else if (metrics.clickbaitScore >= 25) gaugeColor = '#F59E0B'; // Amber

  // Sentiment polarity normalized (-1 to +1 -> 0% to 100% for center-based progress bar)
  // 0 is centered at 50%
  const polarityPct = Math.round(((metrics.polarity + 1) / 2) * 100);

  return (
    <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-6 shadow-xl shadow-black/40 flex flex-col justify-between relative overflow-hidden">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Gauge className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
                Clickbait &amp; Emotion Meter
              </h2>
              <span className="text-[11px] text-slate-500">
                Sensationalism &amp; Linguistic Bias Telemetry
              </span>
            </div>
          </div>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
              metrics.clickbaitScore >= 70
                ? 'bg-rose-950/60 text-rose-400 border-rose-800/50'
                : metrics.clickbaitScore >= 35
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/50'
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
            }`}
          >
            {metrics.clickbaitRiskTier}
          </span>
        </div>

        {/* Semi-Circular Clickbait Risk Gauge */}
        <div className="flex flex-col items-center justify-center pt-2 pb-4">
          <div className="relative w-48 h-28 flex items-center justify-center">
            <svg viewBox="0 0 160 90" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="35%" stopColor="#F59E0B" />
                  <stop offset="70%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>
              {/* Background Arc */}
              <path
                d="M 12 80 A 68 68 0 0 1 148 80"
                fill="none"
                stroke="#1E293B"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {/* Foreground Meter Arc */}
              <path
                d="M 12 80 A 68 68 0 0 1 148 80"
                fill="none"
                stroke={gaugeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${arcLength}`}
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Gauge Value Overlay */}
            <div className="absolute bottom-1 text-center flex flex-col items-center">
              <span className="text-3xl font-extrabold font-mono text-white tabular-nums tracking-tight">
                {metrics.clickbaitScore}
                <span className="text-lg font-normal text-slate-400">/100</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Clickbait Risk Score
              </span>
            </div>
          </div>

          {/* Trigger Tags Pill Row */}
          <div className="w-full mt-3 text-center">
            <span className="text-[11px] text-slate-400 font-mono">
              Suspicious Triggers:{' '}
              {metrics.clickbaitTriggers.length > 0 ? (
                <span className="text-amber-400 font-semibold">
                  {metrics.clickbaitTriggers.join(', ')}
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">None detected</span>
              )}
            </span>
          </div>
        </div>

        {/* 4 Metric Cards with Progress Bars */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {/* 1. Emotion / Subjectivity Score */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                Subjectivity
              </span>
              <span className="text-xs font-mono font-bold text-violet-400 tabular-nums">
                {metrics.subjectivity}%
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-violet-500 h-full transition-all duration-700"
                style={{ width: `${metrics.subjectivity}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {metrics.subjectivity < 30 ? 'Objective Journalism' : metrics.subjectivity < 60 ? 'Moderate Editorial' : 'Highly Opinionated'}
            </span>
          </div>

          {/* 2. Sentiment Polarity */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                Sentiment Polarity
              </span>
              <span className="text-xs font-mono font-bold text-blue-400 tabular-nums">
                {metrics.polarity > 0 ? `+${metrics.polarity}` : metrics.polarity}
              </span>
            </div>
            {/* Center-balanced bar */}
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2 relative">
              <div
                className={`h-full transition-all duration-700 ${
                  metrics.polarity < 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.abs(metrics.polarity) * 50}%`,
                  marginLeft: metrics.polarity >= 0 ? '50%' : `${50 - Math.abs(metrics.polarity) * 50}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block truncate" title={metrics.polarityLabel}>
              {metrics.polarityLabel}
            </span>
          </div>

          {/* 3. ALL-CAPS Shouting Count */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                ALL-CAPS Words
              </span>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  metrics.capsCount > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {metrics.capsCount}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-amber-500 h-full transition-all duration-700"
                style={{ width: `${Math.min(100, metrics.capsCount * 20)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block truncate" title={metrics.capsList.join(', ')}>
              {metrics.capsList.length > 0 ? `[${metrics.capsList.slice(0, 3).join(', ')}]` : 'None detected'}
            </span>
          </div>

          {/* 4. Punctuation Abuse Count */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                Punctuation Abuse
              </span>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  metrics.punctCount > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {metrics.punctCount}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-rose-500 h-full transition-all duration-700"
                style={{ width: `${Math.min(100, metrics.punctCount * 20)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {metrics.punctCount >= 3 ? 'Excessive exclamation/?' : metrics.punctCount > 0 ? 'Occasional exclamation' : 'Standard journalistic syntax'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
        <span className="text-slate-400 font-medium">Linguistic Biases:</span> Clickbait articles typically
        exhibit high emotional polarity, high subjectivity (&gt;65%), and elevated punctuation density.
      </div>
    </div>
  );
};
