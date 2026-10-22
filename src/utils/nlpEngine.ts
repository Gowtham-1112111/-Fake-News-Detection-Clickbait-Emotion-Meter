import { AnalysisResult, EnsembleVote, FeatureImpact, MetricBreakdown, VerdictType } from '../types';

// Stop words to ignore during TF-IDF weighting
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m',
  'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t',
  'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t',
  'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s',
  'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself',
  'yourselves'
]);

// Clickbait trigger word bank
export const CLICKBAIT_TRIGGERS: { [phrase: string]: number } = {
  'shocking': 28,
  'unbelievable': 30,
  'secret': 22,
  'miracle': 32,
  'exposed': 26,
  'overnight': 24,
  'you won\'t believe': 35,
  'viral': 20,
  'revealed': 18,
  'cure all': 34,
  'cures everything': 36,
  'conspiracy': 25,
  'hoax': 22,
  'they don\'t want you to know': 38,
  'leaked': 20,
  'big pharma': 30,
  'hiding this': 32,
  'bombshell': 24,
  'wake up': 22,
  'urgent': 18,
  'must see': 24,
  'click here': 32,
  'warning': 16,
  'alien': 28,
  'immortality': 30,
  'brain damage': 26,
  'mind control': 32,
  'refuse': 14,
  'banned': 22,
  'destroyed': 16,
  'won\'t believe': 30,
  'this simple trick': 34,
  'billionaire overnight': 36,
  'hidden truth': 28,
};

// Institutional / factual marker terms
export const INSTITUTIONAL_MARKERS: { [word: string]: number } = {
  'reuters': 35,
  'associated press': 35,
  'announced': 22,
  'ministry': 26,
  'spokesperson': 24,
  'according': 20,
  'percent': 18,
  'percentage': 18,
  'central bank': 28,
  'published': 22,
  'researchers': 25,
  'study': 20,
  'university': 22,
  'official': 24,
  'statement': 20,
  'quarterly': 22,
  'investigation': 18,
  'confirmed': 22,
  'department': 20,
  'council': 20,
  'agreement': 20,
  'director': 18,
  'economic': 22,
  'economy': 18,
  'growth': 16,
  'policy': 20,
  'journal': 24,
  'peer-reviewed': 32,
  'data': 18,
  'federal': 22,
  'treasury': 24,
  'inflation': 18,
  'scientists': 20,
  'consensus': 22,
  'budget': 18,
  'infrastructure': 20,
  'census': 24,
  'statistics': 24,
};

// Sentiment & Subjectivity Lexicon (adapted from TextBlob pattern lexicon)
const SUBJECTIVITY_LEXICON: { [word: string]: { sub: number; pol: number } } = {
  // Negative / Alarmist
  'shocking': { sub: 0.9, pol: -0.8 },
  'terrible': { sub: 0.85, pol: -0.7 },
  'horrible': { sub: 0.9, pol: -0.85 },
  'disastrous': { sub: 0.8, pol: -0.8 },
  'evil': { sub: 0.95, pol: -0.9 },
  'corrupt': { sub: 0.85, pol: -0.75 },
  'lethal': { sub: 0.75, pol: -0.7 },
  'dangerous': { sub: 0.7, pol: -0.6 },
  'crisis': { sub: 0.6, pol: -0.5 },
  'deadly': { sub: 0.75, pol: -0.65 },
  'apocalypse': { sub: 0.95, pol: -0.9 },
  'devastating': { sub: 0.85, pol: -0.75 },
  'panic': { sub: 0.8, pol: -0.6 },
  'fraud': { sub: 0.8, pol: -0.7 },
  'scam': { sub: 0.9, pol: -0.8 },

  // Positive / Sensationalist or genuine
  'miracle': { sub: 0.95, pol: 0.9 },
  'incredible': { sub: 0.85, pol: 0.75 },
  'unbelievable': { sub: 0.9, pol: 0.7 },
  'amazing': { sub: 0.8, pol: 0.8 },
  'spectacular': { sub: 0.8, pol: 0.75 },
  'genius': { sub: 0.85, pol: 0.8 },
  'extraordinary': { sub: 0.75, pol: 0.7 },
  'breakthrough': { sub: 0.6, pol: 0.65 },
  'triumph': { sub: 0.7, pol: 0.8 },
  'flawless': { sub: 0.85, pol: 0.85 },

  // Subjective opinion markers
  'feel': { sub: 0.7, pol: 0.0 },
  'believe': { sub: 0.7, pol: 0.1 },
  'opinion': { sub: 0.8, pol: 0.0 },
  'think': { sub: 0.5, pol: 0.0 },
  'supposedly': { sub: 0.75, pol: -0.1 },
  'allegedly': { sub: 0.6, pol: -0.1 },
  'personally': { sub: 0.8, pol: 0.0 },
  'obviously': { sub: 0.65, pol: 0.1 },
  'certainly': { sub: 0.55, pol: 0.2 },
  'worst': { sub: 0.85, pol: -0.8 },
  'best': { sub: 0.8, pol: 0.8 },

  // Objective / Institutional terms (low subjectivity, neutral polarity)
  'announced': { sub: 0.1, pol: 0.0 },
  'reported': { sub: 0.1, pol: 0.0 },
  'documented': { sub: 0.05, pol: 0.0 },
  'measured': { sub: 0.05, pol: 0.0 },
  'calculated': { sub: 0.05, pol: 0.0 },
  'published': { sub: 0.1, pol: 0.05 },
  'approved': { sub: 0.2, pol: 0.3 },
  'declined': { sub: 0.2, pol: -0.2 },
  'increased': { sub: 0.1, pol: 0.1 },
  'decreased': { sub: 0.1, pol: -0.1 },
  'steady': { sub: 0.15, pol: 0.1 },
  'annual': { sub: 0.05, pol: 0.0 },
};

// Known safe acronyms that shouldn't be penalized as screaming all-caps
const SAFE_ACRONYMS = new Set([
  'NASA', 'USA', 'UK', 'EU', 'UN', 'WHO', 'IMF', 'CEO', 'CFO', 'CTO',
  'FBI', 'CIA', 'FDA', 'CDC', 'GDP', 'CPI', 'OECD', 'NATO', 'AI', 'ML',
  'COVID', 'COVID-19', 'HIV', 'DNA', 'RNA', 'STEM', 'GOP', 'DNC'
]);

/**
 * Text Preprocessing / Cleaning
 */
export function cleanText(rawText: string): string {
  return rawText
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/g, ' ') // Strip URLs
    .replace(/\(reuters\)/gi, ' ') // Strip Reuters agency headers
    .replace(/\[.*?\]/g, ' ') // Strip square brackets
    .replace(/[^\w\s'-]/g, ' ') // Retain words, hyphens, spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute Sentiment Polarity and Subjectivity (TextBlob simulation)
 */
export function computeSentimentAndSubjectivity(fullText: string): { subjectivity: number; polarity: number } {
  const words = fullText.toLowerCase().match(/\b[a-z'-]+\b/g) || [];
  if (words.length === 0) {
    return { subjectivity: 0, polarity: 0 };
  }

  let totalSub = 0;
  let subCount = 0;
  let totalPol = 0;
  let polCount = 0;

  for (const word of words) {
    if (SUBJECTIVITY_LEXICON[word]) {
      const entry = SUBJECTIVITY_LEXICON[word];
      totalSub += entry.sub;
      subCount += 1;
      totalPol += entry.pol;
      polCount += 1;
    }
  }

  // Base subjectivity background expectation for journalism is ~15-25%
  let subScore = subCount > 0 ? (totalSub / subCount) * 100 : 15;
  // If exclamation marks or high clickbait words exist, bump subjectivity
  const exclamations = (fullText.match(/!/g) || []).length;
  if (exclamations > 0) {
    subScore = Math.min(100, subScore + Math.min(25, exclamations * 5));
  }

  const polarityScore = polCount > 0 ? Math.max(-1.0, Math.min(1.0, totalPol / polCount)) : 0.0;

  return {
    subjectivity: Math.round(subScore * 10) / 10,
    polarity: Math.round(polarityScore * 100) / 100,
  };
}

/**
 * Detect ALL-CAPS words (shouting)
 */
export function detectAllCapsWords(rawText: string): { count: number; list: string[] } {
  const matches = rawText.match(/\b[A-Z]{2,}\b/g) || [];
  const shoutingWords = matches.filter(w => !SAFE_ACRONYMS.has(w));
  return {
    count: shoutingWords.length,
    list: Array.from(new Set(shoutingWords)),
  };
}

/**
 * Detect Punctuation Abuse (! and ? counts)
 */
export function detectPunctuationAbuse(rawText: string): number {
  const exclamations = (rawText.match(/!/g) || []).length;
  const questions = (rawText.match(/\?/g) || []).length;
  // Extra weight for multi-punctuation chains like "!!!" or "?!"
  const multiChains = (rawText.match(/[!?]{2,}/g) || []).length;
  return exclamations + questions + (multiChains * 2);
}

/**
 * Clickbait Risk Score Calculation (0 - 100)
 */
export function computeClickbaitScore(
  headline: string,
  content: string,
  capsCount: number,
  punctCount: number
): { score: number; triggers: string[] } {
  const combined = (headline + ' ' + content).toLowerCase();
  const foundTriggers: string[] = [];
  let triggerWeight = 0;

  for (const [phrase, weight] of Object.entries(CLICKBAIT_TRIGGERS)) {
    if (combined.includes(phrase)) {
      foundTriggers.push(phrase);
      triggerWeight += weight;
    }
  }

  // Headline specific checks (headlines have 2x impact)
  const headlineLower = headline.toLowerCase();
  let headlineMultiplier = 1.0;
  if (/^(shocking|breaking|exposed|warning|revealed|urgent):?/i.test(headlineLower)) {
    headlineMultiplier = 1.35;
  }
  if (/cures|secret|miracle|overnight|trick/i.test(headlineLower)) {
    headlineMultiplier = Math.max(headlineMultiplier, 1.25);
  }

  // Scoring composition:
  // Base trigger weight + caps penalty + punctuation penalty
  let rawScore = (triggerWeight * 0.95 * headlineMultiplier) + (capsCount * 6) + (punctCount * 4.5);

  // If text is rich in institutional markers, discount the risk
  let institutionalMitigation = 0;
  for (const [marker, weight] of Object.entries(INSTITUTIONAL_MARKERS)) {
    if (combined.includes(marker)) {
      institutionalMitigation += weight * 0.25;
    }
  }

  rawScore = Math.max(0, rawScore - institutionalMitigation);
  const finalScore = Math.min(100, Math.round(rawScore));

  return {
    score: finalScore,
    triggers: Array.from(new Set(foundTriggers)),
  };
}

/**
 * 3-Model Machine Learning Ensemble Voting Simulation
 * Models:
 * 1. Logistic Regression (TF-IDF)
 * 2. Multinomial Naive Bayes
 * 3. Passive Aggressive Classifier
 */
export function computeEnsembleVotes(
  headline: string,
  content: string,
  clickbaitScore: number,
  subjectivity: number,
  capsCount: number,
  punctCount: number
): { votes: EnsembleVote[]; overallVerdict: VerdictType; overallConfidence: number } {
  const fullText = headline + ' ' + content;
  const cleaned = cleanText(fullText);
  const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Compute corpus feature affinity
  let fakeWeight = 0;
  let realWeight = 0;

  for (const word of words) {
    if (CLICKBAIT_TRIGGERS[word]) {
      fakeWeight += CLICKBAIT_TRIGGERS[word] * 1.5;
    }
    if (INSTITUTIONAL_MARKERS[word]) {
      realWeight += INSTITUTIONAL_MARKERS[word] * 1.5;
    }
  }

  // Also check bigrams (e.g. "central bank", "you won't believe", "peer-reviewed")
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (CLICKBAIT_TRIGGERS[bigram]) {
      fakeWeight += CLICKBAIT_TRIGGERS[bigram] * 2.0;
    }
    if (INSTITUTIONAL_MARKERS[bigram]) {
      realWeight += INSTITUTIONAL_MARKERS[bigram] * 2.0;
    }
  }

  // Heuristic adjustments
  fakeWeight += (capsCount * 4) + (punctCount * 3) + (clickbaitScore * 0.4);
  if (subjectivity > 60) {
    fakeWeight += (subjectivity - 60) * 0.5;
  }
  if (words.length > 40 && realWeight > fakeWeight) {
    // Longer journalistic articles with institutional terms gain credibility
    realWeight += 15;
  }

  // 1. Logistic Regression: Sigmoid curve on net margin
  // z = (realWeight - fakeWeight) / 25
  const lrDelta = realWeight - fakeWeight;
  const lrZ = lrDelta / 28;
  const lrProbReal = 1 / (1 + Math.exp(-lrZ));
  const lrPctReal = Math.round(lrProbReal * 100);
  const lrPctFake = 100 - lrPctReal;
  const lrVote: EnsembleVote = {
    model: 'Logistic Regression',
    prediction: lrPctReal >= 50 ? 'REAL' : 'FAKE',
    probabilityReal: lrPctReal,
    probabilityFake: lrPctFake,
    weight: 1.0,
  };

  // 2. Multinomial Naive Bayes: Log-likelihood prior + term frequencies
  // Laplace smoothing simulation
  const nbPriorReal = 0.5;
  const nbLikelihoodReal = (realWeight + 10) / (realWeight + fakeWeight + 20);
  const nbProbReal = (nbLikelihoodReal * nbPriorReal) /
    (nbLikelihoodReal * nbPriorReal + (1 - nbLikelihoodReal) * (1 - nbPriorReal));
  const nbPctReal = Math.round(Math.max(5, Math.min(95, nbProbReal * 100)));
  const nbPctFake = 100 - nbPctReal;
  const nbVote: EnsembleVote = {
    model: 'Multinomial Naive Bayes',
    prediction: nbPctReal >= 50 ? 'REAL' : 'FAKE',
    probabilityReal: nbPctReal,
    probabilityFake: nbPctFake,
    weight: 0.9,
  };

  // 3. Passive Aggressive Classifier: Margin-based hinge loss updates
  // High sensitivity to outlier sensationalism words
  const pacMargin = (realWeight - (fakeWeight * 1.15)) / 22;
  const pacScore = Math.tanh(pacMargin); // maps -1 to +1
  const pacProbReal = (pacScore + 1) / 2;
  const pacPctReal = Math.round(Math.max(3, Math.min(97, pacProbReal * 100)));
  const pacPctFake = 100 - pacPctReal;
  const pacVote: EnsembleVote = {
    model: 'Passive Aggressive',
    prediction: pacPctReal >= 50 ? 'REAL' : 'FAKE',
    probabilityReal: pacPctReal,
    probabilityFake: pacPctFake,
    weight: 1.1,
  };

  const votes = [lrVote, nbVote, pacVote];

  // Weighted ensemble voting
  const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
  const weightedRealProb = votes.reduce((sum, v) => sum + (v.probabilityReal * v.weight), 0) / totalWeight;

  let overallVerdict: VerdictType = 'UNCERTAIN / MIXED';
  let overallConfidence = Math.round(weightedRealProb);

  if (weightedRealProb >= 53) {
    overallVerdict = 'LIKELY REAL NEWS';
    overallConfidence = Math.round(weightedRealProb);
  } else if (weightedRealProb <= 47) {
    overallVerdict = 'LIKELY FAKE NEWS';
    overallConfidence = Math.round(100 - weightedRealProb);
  } else {
    overallVerdict = 'UNCERTAIN / MIXED';
    overallConfidence = 50;
  }

  return {
    votes,
    overallVerdict,
    overallConfidence: Math.max(51, overallConfidence),
  };
}

/**
 * Compute Diverging Feature Impact (Explainable AI / XAI)
 * Returns top features pushing towards FAKE (negative values) vs REAL (positive values)
 */
export function computeFeatureImpacts(headline: string, content: string): FeatureImpact[] {
  const fullText = headline + ' ' + content;
  const words = fullText.toLowerCase().match(/\b[a-z'-]+\b/g) || [];
  const wordFreq: { [w: string]: number } = {};

  for (const w of words) {
    if (w.length > 2 && !STOP_WORDS.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  const impacts: FeatureImpact[] = [];

  for (const [w, freq] of Object.entries(wordFreq)) {
    if (CLICKBAIT_TRIGGERS[w]) {
      const impactScore = -(CLICKBAIT_TRIGGERS[w] * 0.15 * Math.sqrt(freq));
      impacts.push({
        word: w,
        score: Math.round(impactScore * 10) / 10,
        category: 'fake_trigger',
        frequency: freq,
      });
    } else if (INSTITUTIONAL_MARKERS[w]) {
      const impactScore = INSTITUTIONAL_MARKERS[w] * 0.15 * Math.sqrt(freq);
      impacts.push({
        word: w,
        score: Math.round(impactScore * 10) / 10,
        category: 'institutional_real',
        frequency: freq,
      });
    }
  }

  // Also include Caps if present
  const caps = detectAllCapsWords(fullText);
  if (caps.count > 0) {
    impacts.push({
      word: `ALL-CAPS (${caps.count} words)`,
      score: -(Math.min(10, caps.count * 1.2)),
      category: 'caps_shouting',
      frequency: caps.count,
    });
  }

  // Sort by absolute score descending and slice top 10
  impacts.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  return impacts.slice(0, 10);
}

/**
 * Main Full Pipeline Analysis Function
 */
export function analyzeArticle(headline: string, content: string): AnalysisResult {
  const fullText = (headline + ' ' + content).trim();
  const wordList = fullText.match(/\b\S+\b/g) || [];
  const wordCount = wordList.length;
  const charCount = fullText.length;
  const readTimeSeconds = Math.max(1, Math.round((wordCount / 200) * 60));

  const { subjectivity, polarity } = computeSentimentAndSubjectivity(fullText);
  const { count: capsCount, list: capsList } = detectAllCapsWords(fullText);
  const punctCount = detectPunctuationAbuse(fullText);
  const { score: clickbaitScore, triggers: clickbaitTriggers } = computeClickbaitScore(
    headline,
    content,
    capsCount,
    punctCount
  );

  let clickbaitRiskTier: MetricBreakdown['clickbaitRiskTier'] = 'Minimal Risk';
  if (clickbaitScore >= 75) clickbaitRiskTier = 'Extreme Manipulation';
  else if (clickbaitScore >= 50) clickbaitRiskTier = 'High Clickbait';
  else if (clickbaitScore >= 25) clickbaitRiskTier = 'Moderate Sensationalism';

  let polarityLabel: MetricBreakdown['polarityLabel'] = 'Neutral';
  if (polarity <= -0.2) polarityLabel = 'Negative / Alarmist';
  else if (polarity >= 0.2) polarityLabel = 'Positive / Optimistic';

  const { votes, overallVerdict, overallConfidence } = computeEnsembleVotes(
    headline,
    content,
    clickbaitScore,
    subjectivity,
    capsCount,
    punctCount
  );

  const featureImpacts = computeFeatureImpacts(headline, content);

  return {
    id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    headline,
    content,
    verdict: overallVerdict,
    confidence: overallConfidence,
    ensembleVotes: votes,
    metrics: {
      subjectivity,
      polarity,
      polarityLabel,
      capsCount,
      capsList,
      punctCount,
      clickbaitScore,
      clickbaitRiskTier,
      clickbaitTriggers,
      wordCount,
      charCount,
      readTimeSeconds,
    },
    featureImpacts,
    sourceEngine: 'client_deterministic_ml',
  };
}

const NEUTRAL_REPLACEMENTS: { [key: string]: string } = {
  'shocking': 'notable',
  'unbelievable': 'significant',
  'secret': 'documented',
  'miracle': 'clinical',
  'exposed': 'examined',
  'overnight': 'gradually',
  'viral': 'widely shared',
  'revealed': 'reported',
  'hoax': 'disputed claim',
  'conspiracy': 'policy debate',
  'leaked': 'released',
  'bombshell': 'official',
  'urgent': 'scheduled',
  'warning': 'notice',
  'banned': 'regulated',
  'refuse': 'decline',
  'destroyed': 'impacted',
  'click here': 'according to the report',
  'big pharma': 'medical researchers',
  'cures everything': 'shows measured effects',
  'you won\'t believe': 'official data indicates',
};

/**
 * Neutralize a specific trigger token or ALL-CAPS word in a text string
 */
export function neutralizeTriggerToken(text: string, tokenToNeutralize: string): string {
  const trimmed = tokenToNeutralize.trim();
  if (!trimmed) return text;

  // Punctuation bursts like !!! or ?!
  if (/^[!?]+$/.test(trimmed)) {
    return text.replace(/[!?]{2,}/g, '.').replace(/!/g, '.');
  }

  const lower = trimmed.toLowerCase();
  const replacement = NEUTRAL_REPLACEMENTS[lower] || lower;

  // Escape regex special chars
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'g');
  return text.replace(regex, replacement);
}

/**
 * Neutralize all sensationalism, shouting ALL-CAPS, and excessive punctuation across headline & content
 */
export function neutralizeAllSensationalism(headline: string, content: string): { headline: string; content: string } {
  const rewrite = (str: string) => {
    let out = str;
    // Multi-word phrases first
    for (const [phrase, rep] of Object.entries(NEUTRAL_REPLACEMENTS)) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp(escaped, 'gi'), rep);
    }
    // Convert remaining shouting ALL-CAPS words to lowercase (except safe acronyms)
    out = out.replace(/\b[A-Z]{2,}\b/g, (match) => {
      if (SAFE_ACRONYMS.has(match)) return match;
      return match.charAt(0) + match.slice(1).toLowerCase();
    });
    // Replace exclamation marks with periods
    out = out.replace(/[!?]{2,}/g, '.').replace(/!/g, '.');
    return out;
  };

  return {
    headline: rewrite(headline),
    content: rewrite(content),
  };
}

