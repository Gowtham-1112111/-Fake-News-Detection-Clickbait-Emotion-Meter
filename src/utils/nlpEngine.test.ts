import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanText,
  detectAllCapsWords,
  detectPunctuationAbuse,
  computeClickbaitScore,
  analyzeArticle,
  computeFeatureImpacts,
  neutralizeTriggerToken,
  neutralizeAllSensationalism
} from './nlpEngine';

test('cleanText removes URLs, Reuters tags, and brackets', () => {
  const raw = 'Breaking News (reuters) [Exclusive] visit https://fake-news.xyz/now for details!';
  const cleaned = cleanText(raw);
  assert.equal(cleaned.includes('https'), false);
  assert.equal(cleaned.includes('reuters'), false);
  assert.equal(cleaned.includes('exclusive'), false);
  assert.equal(cleaned.includes('breaking news visit for details'), true);
});

test('detectAllCapsWords identifies shouting words while preserving safe acronyms', () => {
  const text = 'SHOCKING announcement by NASA and the FBI that YOU MUST SEE NOW!';
  const result = detectAllCapsWords(text);
  assert.equal(result.list.includes('NASA'), false, 'NASA is a safe acronym');
  assert.equal(result.list.includes('FBI'), false, 'FBI is a safe acronym');
  assert.equal(result.list.includes('SHOCKING'), true);
  assert.equal(result.list.includes('MUST'), true);
  assert.equal(result.list.includes('SEE'), true);
  assert.ok(result.count >= 4);
});

test('detectPunctuationAbuse counts question marks, exclamation marks, and combo bursts', () => {
  const text = 'Is this really happening?! The secret will blow your mind!!! Really?';
  const abuse = detectPunctuationAbuse(text);
  assert.ok(abuse >= 5, `Expected high punctuation abuse, got ${abuse}`);
});

test('computeClickbaitScore gives high score to sensationalist headline and triggers', () => {
  const headline = 'SHOCKING: Secret Miracle Water Cures Everything Overnight!';
  const content = 'You won\'t believe this viral video that the government is hiding from you!!!';
  const caps = detectAllCapsWords(headline + ' ' + content);
  const punct = detectPunctuationAbuse(headline + ' ' + content);
  const result = computeClickbaitScore(headline, content, caps.count, punct);
  assert.ok(result.score >= 70, `Expected clickbait score >= 70, got ${result.score}`);
  assert.ok(result.triggers.includes('shocking'));
  assert.ok(result.triggers.includes('secret'));
  assert.ok(result.triggers.includes('miracle'));
});

test('analyzeArticle correctly classifies real economic news', () => {
  const headline = 'Central Bank Announces Interest Rate Stability Following Quarterly Review';
  const content = 'The Federal Reserve reported today that economic growth remains steady at 2.1 percent annually. According to official data published by the Department of Commerce, inflation has moderated and employment statistics remain confirmed by university researchers.';
  const analysis = analyzeArticle(headline, content);

  assert.equal(analysis.verdict, 'LIKELY REAL NEWS');
  assert.ok(analysis.confidence >= 60, `Confidence should be >= 60, got ${analysis.confidence}`);
  assert.ok(analysis.metrics.clickbaitScore < 30, `Clickbait score should be low, got ${analysis.metrics.clickbaitScore}`);
  assert.ok(analysis.metrics.subjectivity < 50, `Subjectivity should be low, got ${analysis.metrics.subjectivity}`);
  assert.equal(analysis.ensembleVotes.length, 3);
  assert.equal(analysis.ensembleVotes[0].prediction, 'REAL');
});

test('analyzeArticle correctly classifies fake viral health hoax', () => {
  const headline = 'SHOCKING: This Secret Drink Cures Cancer Overnight! Big Pharma Hates This!';
  const content = 'You won\'t believe what doctors discovered! This miracle fruit is the banned cure all that the corrupt medical industry refuses to tell you! CLICK HERE NOW TO SEE THE UNBELIEVABLE PROOF BEFORE IT IS TAKEN DOWN!!!';
  const analysis = analyzeArticle(headline, content);

  assert.equal(analysis.verdict, 'LIKELY FAKE NEWS');
  assert.ok(analysis.confidence >= 70, `Confidence should be >= 70, got ${analysis.confidence}`);
  assert.ok(analysis.metrics.clickbaitScore >= 70, `Clickbait score should be >= 70, got ${analysis.metrics.clickbaitScore}`);
  assert.ok(analysis.metrics.capsCount >= 3);
  assert.ok(analysis.metrics.clickbaitTriggers.length >= 4);
});

test('computeFeatureImpacts extracts both fake and real directional features', () => {
  const headline = 'Miracle Cure Exposed by University Researchers';
  const content = 'According to official reports published in the journal, the viral claims were a secret hoax.';
  const impacts = computeFeatureImpacts(headline, content);

  assert.ok(impacts.length > 0);
  const hasNegative = impacts.some(i => i.score < 0);
  const hasPositive = impacts.some(i => i.score > 0);
  assert.ok(hasNegative, 'Should have negative (fake-leaning) impacts');
  assert.ok(hasPositive, 'Should have positive (real-leaning) impacts');
});

test('neutralizeTriggerToken and neutralizeAllSensationalism reduce clickbait score', () => {
  const rawHead = 'SHOCKING: Secret Miracle Water!';
  const rawBody = 'You won\'t believe how this viral secret works overnight!!!';
  const before = analyzeArticle(rawHead, rawBody);

  const singleUpdated = neutralizeTriggerToken(rawHead, 'SHOCKING');
  assert.equal(singleUpdated.includes('notable'), true);

  const rewritten = neutralizeAllSensationalism(rawHead, rawBody);
  const after = analyzeArticle(rewritten.headline, rewritten.content);
  assert.ok(after.metrics.clickbaitScore < before.metrics.clickbaitScore, 'Neutralized article must have lower clickbait score');
});
