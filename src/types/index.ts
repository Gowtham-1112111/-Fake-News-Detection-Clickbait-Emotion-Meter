export type VerdictType = 'LIKELY REAL NEWS' | 'LIKELY FAKE NEWS' | 'UNCERTAIN / MIXED';

export interface EnsembleVote {
  model: 'Logistic Regression' | 'Multinomial Naive Bayes' | 'Passive Aggressive';
  prediction: 'REAL' | 'FAKE';
  probabilityReal: number; // 0 - 100
  probabilityFake: number; // 0 - 100
  weight: number;
}

export interface FeatureImpact {
  word: string;
  score: number; // Negative = Pushes toward FAKE, Positive = Pushes toward REAL
  category: 'fake_trigger' | 'caps_shouting' | 'punctuation' | 'institutional_real' | 'neutral';
  frequency: number;
}

export interface MetricBreakdown {
  subjectivity: number; // 0 - 100%
  polarity: number; // -1.0 to +1.0
  polarityLabel: 'Negative / Alarmist' | 'Neutral' | 'Positive / Optimistic';
  capsCount: number;
  capsList: string[];
  punctCount: number;
  clickbaitScore: number; // 0 - 100
  clickbaitRiskTier: 'Minimal Risk' | 'Moderate Sensationalism' | 'High Clickbait' | 'Extreme Manipulation';
  clickbaitTriggers: string[];
  wordCount: number;
  charCount: number;
  readTimeSeconds: number;
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  headline: string;
  content: string;
  verdict: VerdictType;
  confidence: number; // 0 - 100%
  ensembleVotes: EnsembleVote[];
  metrics: MetricBreakdown;
  featureImpacts: FeatureImpact[];
  sourceEngine: 'client_deterministic_ml' | 'flask_backend_api';
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  headline: string;
  verdict: VerdictType;
  confidence: number;
  clickbaitScore: number;
  subjectivity: number;
}

export interface SampleArticle {
  id: string;
  label: string;
  typeBadge: string;
  headline: string;
  content: string;
  expectedVerdict: 'REAL' | 'FAKE' | 'MIXED';
}
