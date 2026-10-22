/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ForensicObservatory3D } from './components/ForensicObservatory3D';
import { HeroInputSection } from './components/HeroInputSection';
import { CredibilityCard } from './components/CredibilityCard';
import { ClickbaitEmotionCard } from './components/ClickbaitEmotionCard';
import { XaiHighlighter } from './components/XaiHighlighter';
import { HistorySection } from './components/HistorySection';
import { CollegeProjectModal } from './components/CollegeProjectModal';
import { SAMPLE_ARTICLES } from './data/samples';
import { AnalysisResult, HistoryItem } from './types';
import { executeAnalysis, ApiConfig } from './utils/apiService';
import {
  analyzeArticle,
  neutralizeTriggerToken,
  neutralizeAllSensationalism,
} from './utils/nlpEngine';

export default function App() {
  const [activeSampleId, setActiveSampleId] = useState(SAMPLE_ARTICLES[0].id);
  const [headline, setHeadline] = useState(SAMPLE_ARTICLES[0].headline);
  const [content, setContent] = useState(SAMPLE_ARTICLES[0].content);
  const [result, setResult] = useState<AnalysisResult | null>(() =>
    analyzeArticle(SAMPLE_ARTICLES[0].headline, SAMPLE_ARTICLES[0].content)
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProjectCodeOpen, setIsProjectCodeOpen] = useState(false);
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    mode: 'client',
    endpoint: 'http://localhost:5000/predict',
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fakeai_audit_history') || localStorage.getItem('verilens_audit_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      } else {
        const initRes = analyzeArticle(SAMPLE_ARTICLES[0].headline, SAMPLE_ARTICLES[0].content);
        const seedItem: HistoryItem = {
          id: initRes.id,
          timestamp: initRes.timestamp,
          headline: SAMPLE_ARTICLES[0].headline,
          verdict: initRes.verdict,
          confidence: initRes.confidence,
          clickbaitScore: initRes.metrics.clickbaitScore,
          subjectivity: initRes.metrics.subjectivity,
        };
        setHistory([seedItem]);
      }
    } catch (e) {
      console.warn('Could not read history from localStorage', e);
    }
  }, []);

  const runAnalysis = async (headToAnalyze = headline, contentToAnalyze = content) => {
    if (!headToAnalyze.trim() && !contentToAnalyze.trim()) return;

    setIsAnalyzing(true);
    try {
      const res = await executeAnalysis(headToAnalyze, contentToAnalyze, apiConfig);
      setResult(res);

      const newHistoryItem: HistoryItem = {
        id: res.id,
        timestamp: res.timestamp,
        headline: headToAnalyze || 'Untitled Article',
        verdict: res.verdict,
        confidence: res.confidence,
        clickbaitScore: res.metrics.clickbaitScore,
        subjectivity: res.metrics.subjectivity,
      };

      setHistory((prev) => {
        const updated = [
          newHistoryItem,
          ...prev.filter((p) => p.headline !== newHistoryItem.headline),
        ].slice(0, 30);
        try {
          localStorage.setItem('fakeai_audit_history', JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to store history in localStorage', e);
        }
        return updated;
      });
    } catch (err) {
      console.error('Analysis failed', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickLoadSample = (sampleId: string) => {
    const sample = SAMPLE_ARTICLES.find((s) => s.id === sampleId);
    if (!sample) return;
    setActiveSampleId(sample.id);
    setHeadline(sample.headline);
    setContent(sample.content);
    runAnalysis(sample.headline, sample.content);
  };

  const handleNeutralizeToken = (token: string) => {
    const nextHead = neutralizeTriggerToken(headline, token);
    const nextBody = neutralizeTriggerToken(content, token);
    setHeadline(nextHead);
    setContent(nextBody);
    runAnalysis(nextHead, nextBody);
  };

  const handleNeutralizeAll = () => {
    const rewritten = neutralizeAllSensationalism(headline, content);
    setHeadline(rewritten.headline);
    setContent(rewritten.content);
    runAnalysis(rewritten.headline, rewritten.content);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setHeadline(item.headline);
    const matchedSample = SAMPLE_ARTICLES.find((s) => s.headline === item.headline);
    if (matchedSample) {
      setActiveSampleId(matchedSample.id);
      setContent(matchedSample.content);
      runAnalysis(matchedSample.headline, matchedSample.content);
    } else {
      runAnalysis(item.headline, content);
    }
    const element = document.getElementById('verifier-input');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('fakeai_audit_history');
    localStorage.removeItem('verilens_audit_history');
    setHistory([]);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-indigo-600/30 selection:text-indigo-200">
      {/* 1. Full-Bleed (100vw x 100vh) Interactive 3D Forensic Observatory & Collapsible Dock */}
      <ForensicObservatory3D
        result={result}
        activeSampleId={activeSampleId}
        onQuickLoadSample={handleQuickLoadSample}
        onScrollToWorkbench={() => scrollToSection('verifier-input')}
        onOpenProjectCode={() => setIsProjectCodeOpen(true)}
      />

      {/* 2. Interactive NLP Workbench, Dual-Engine Dashboard, XAI De-Sensationalizer & Log */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8">
        {/* Hero Input & Live Phrase Injector */}
        <HeroInputSection
          headline={headline}
          setHeadline={setHeadline}
          content={content}
          setContent={setContent}
          onAnalyze={(customH, customB) =>
            runAnalysis(customH ?? headline, customB ?? content)
          }
          onQuickLoadSample={handleQuickLoadSample}
          isAnalyzing={isAnalyzing}
          apiConfig={apiConfig}
          setApiConfig={setApiConfig}
        />

        {/* Dual-Engine Results Dashboard (2-Column Grid) */}
        {result && (
          <div id="ensemble-dashboard" className="w-full pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Left Card: Machine Learning Credibility Verdict */}
              <CredibilityCard result={result} />

              {/* Right Card: Clickbait & Emotion Meter */}
              <div id="emotion-meter" className="h-full">
                <ClickbaitEmotionCard metrics={result.metrics} />
              </div>
            </div>

            {/* Interactive Explainable AI (XAI) Word Highlighter & Diverging Bar Chart */}
            <XaiHighlighter
              headline={result.headline}
              content={result.content}
              featureImpacts={result.featureImpacts}
              onNeutralizeToken={handleNeutralizeToken}
              onNeutralizeAll={handleNeutralizeAll}
            />
          </div>
        )}

        {/* Verification History Log Table */}
        <HistorySection
          history={history}
          onClearHistory={handleClearHistory}
          onSelectHistoryItem={handleSelectHistoryItem}
        />
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#0B0F19] py-8 px-4 md:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">fakeAI Forensics</span>
            <span>·</span>
            <span>3D WebGL Truth Gyroscope &amp; Ensemble Scikit-Learn</span>
          </div>
          <div>
            <span>Dual Pipeline: Client-Side Heuristics + Python Flask REST Service</span>
          </div>
        </div>
      </footer>

      {/* College Project Code & Setup Modal */}
      <CollegeProjectModal
        isOpen={isProjectCodeOpen}
        onClose={() => setIsProjectCodeOpen(false)}
      />
    </div>
  );
}
