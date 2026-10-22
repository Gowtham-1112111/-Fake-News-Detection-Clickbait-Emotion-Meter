import React from 'react';
import { AnalysisResult } from '../types';
import { ShieldCheck, ShieldAlert, Cpu, Vote, HelpCircle } from 'lucide-react';

interface CredibilityCardProps {
  result: AnalysisResult;
}

export const CredibilityCard: React.FC<CredibilityCardProps> = ({ result }) => {
  const isReal = result.verdict === 'LIKELY REAL NEWS';
  const isFake = result.verdict === 'LIKELY FAKE NEWS';

  const realVotesCount = result.ensembleVotes.filter((v) => v.prediction === 'REAL').length;
  const totalModels = result.ensembleVotes.length;

  return (
    <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-6 shadow-xl shadow-black/40 flex flex-col justify-between relative overflow-hidden">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Cpu className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
                ML Credibility Verdict
              </h2>
              <span className="text-[11px] text-slate-500">
                3-Model Ensemble Classification Engine
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {realVotesCount}/{totalModels} Models Agree
          </span>
        </div>

        {/* Big Verdict Banner */}
        <div
          className={`p-5 rounded-xl border mb-6 transition-all ${
            isReal
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
              : isFake
              ? 'bg-rose-950/30 border-rose-500/30 text-rose-400'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-400'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isReal ? (
                <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
              ) : isFake ? (
                <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
              ) : (
                <HelpCircle className="w-8 h-8 text-amber-400 shrink-0" />
              )}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                  Forensic Outcome
                </span>
                <span className="text-2xl md:text-3xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                  {result.verdict}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                Model Confidence
              </span>
              <span className="text-2xl md:text-3xl font-extrabold font-mono tabular-nums">
                {result.confidence}%
              </span>
            </div>
          </div>

          {/* Primary Confidence Bar */}
          <div className="w-full bg-slate-900/80 h-2.5 rounded-full mt-4 overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isReal ? 'bg-emerald-500' : isFake ? 'bg-rose-500' : 'bg-amber-500'
              }`}
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>

        {/* 3-Model Ensemble Voting Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Vote className="w-3.5 h-3.5 text-blue-400" />
              Ensemble Voting Breakdown
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Real vs. Fake Probability
            </span>
          </div>

          <div className="space-y-3">
            {result.ensembleVotes.map((vote) => (
              <div
                key={vote.model}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">{vote.model}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        vote.prediction === 'REAL'
                          ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {vote.prediction}
                    </span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {vote.prediction === 'REAL' ? vote.probabilityReal : vote.probabilityFake}%
                    </span>
                  </div>
                </div>

                {/* Dual Split Probability Bar */}
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500/80 h-full transition-all duration-500"
                    style={{ width: `${vote.probabilityReal}%` }}
                    title={`Real Probability: ${vote.probabilityReal}%`}
                  />
                  <div
                    className="bg-rose-500/80 h-full transition-all duration-500"
                    style={{ width: `${vote.probabilityFake}%` }}
                    title={`Fake Probability: ${vote.probabilityFake}%`}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
                  <span>Real: {vote.probabilityReal}%</span>
                  <span>Fake: {vote.probabilityFake}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ensemble Methodology Note */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 leading-relaxed">
        <span className="text-slate-400 font-medium">Why Ensemble?</span> Combining linear models
        (Logistic Regression), probabilistic log-likelihoods (Naive Bayes), and margin-based online learners
        (Passive Aggressive) mitigates adversarial phrasing and reduces single-model false positives.
      </div>
    </div>
  );
};
