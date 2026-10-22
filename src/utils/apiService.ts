import { AnalysisResult } from '../types';
import { analyzeArticle } from './nlpEngine';

export interface ApiConfig {
  mode: 'client' | 'flask';
  endpoint: string;
}

export async function executeAnalysis(
  headline: string,
  content: string,
  config: ApiConfig
): Promise<AnalysisResult> {
  if (config.mode === 'client') {
    // Deterministic Client-side ML Ensemble
    return analyzeArticle(headline, content);
  }

  // Attempt to call the Python Flask API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headline, text: content }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Map Flask API response back to full AnalysisResult structure
    const clientFallback = analyzeArticle(headline, content);

    return {
      ...clientFallback,
      verdict: data.verdict || (data.result === 'REAL' ? 'LIKELY REAL NEWS' : 'LIKELY FAKE NEWS'),
      confidence: data.confidence !== undefined ? data.confidence : clientFallback.confidence,
      metrics: {
        ...clientFallback.metrics,
        subjectivity: data.metrics?.subjectivity ?? data.subjectivity ?? clientFallback.metrics.subjectivity,
        polarity: data.metrics?.polarity ?? data.sentiment ?? clientFallback.metrics.polarity,
        capsCount: data.metrics?.caps ?? data.caps_count ?? clientFallback.metrics.capsCount,
        punctCount: data.metrics?.punctuation ?? data.punct_count ?? clientFallback.metrics.punctCount,
        clickbaitScore: data.metrics?.clickbait_score ?? data.clickbait_score ?? clientFallback.metrics.clickbaitScore,
        clickbaitTriggers: data.metrics?.triggers ?? data.clickbait_triggers ?? clientFallback.metrics.clickbaitTriggers,
      },
      sourceEngine: 'flask_backend_api',
    };
  } catch (err: any) {
    console.warn('Flask API unreachable, falling back to client-side engine:', err.message);
    const result = analyzeArticle(headline, content);
    return {
      ...result,
      sourceEngine: 'client_deterministic_ml',
    };
  }
}

export async function pingFlaskApi(endpoint: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(endpoint.replace('/predict', ''), {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - start);
    return {
      success: res.ok || res.status === 404, // Server responded
      latencyMs: latency,
      message: 'Server active and reachable',
    };
  } catch (e: any) {
    return {
      success: false,
      latencyMs: 0,
      message: e.name === 'AbortError' ? 'Connection timed out' : 'Server not responding (offline)',
    };
  }
}
