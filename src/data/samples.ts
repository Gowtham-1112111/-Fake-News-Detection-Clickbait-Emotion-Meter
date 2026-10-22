import { SampleArticle } from '../types';

export const SAMPLE_ARTICLES: SampleArticle[] = [
  {
    id: 'clickbait_fake',
    label: 'Load Viral Clickbait Fake News',
    typeBadge: 'Viral Clickbait',
    expectedVerdict: 'FAKE',
    headline: 'SHOCKING: Secret Miracle Water Cures Everything Overnight! Big Pharma Hates This!',
    content: 'You won\'t believe what independent researchers discovered in this remote underground spring! Doctors are stunned as this viral secret eliminates all fatigue and disease in 24 hours. The corrupt pharmaceutical cartel is actively trying to BAN this video before it exposes their multi-billion dollar hoax! CLICK HERE TO SEE THE LEAKED DOCUMENTS BEFORE THEY ARE TAKEN DOWN PERMANENTLY!!!',
  },
  {
    id: 'health_hoax',
    label: 'Load Health Hoax',
    typeBadge: 'Health Hoax',
    expectedVerdict: 'FAKE',
    headline: 'WARNING: Eating Common Supermarket Fruit Causes Instant Brain Damage and DNA Mutation!',
    content: 'URGENT health bulletin: Scientists have confirmed that a synthetic parasite has infected grocery store produce across the nation. Government regulators refuse to warn the public about this catastrophic health disaster! If you have consumed apples or bananas this week, your immune system is compromised. SHARE THIS BOMBSHELL REPORT with everyone you love right now before it is censored!',
  },
  {
    id: 'economic_report',
    label: 'Load Verified Economic Report',
    typeBadge: 'Verified News',
    expectedVerdict: 'REAL',
    headline: 'Central Bank Maintains Baseline Interest Rates at 4.75% Following Quarterly Inflation Review',
    content: 'The Federal Reserve monetary policy committee announced on Wednesday that benchmark interest rates will remain unchanged at 4.75 percent. According to the official statement published by the central bank, annualized consumer price inflation has moderated to 2.4 percent. University economic analysts and department statistics confirmed that quarterly labor market figures indicate balanced expansion across manufacturing and technology sectors.',
  },
  {
    id: 'opinion_piece',
    label: 'Load Borderline Opinion Piece',
    typeBadge: 'Opinion / Commentary',
    expectedVerdict: 'MIXED',
    headline: 'Opinion: Why Massive Urban Megatowers Are Architecturally Soulless and Socially Alienating',
    content: 'In my personal view, modern metropolitan skyscraper construction has lost its human connection. I believe that glass towers isolate neighborhood communities rather than bringing people together. While municipal planners point to economic density statistics, I feel that human-scale residential avenues foster genuine happiness and civic warmth far better than any 80-story monument.',
  },
];
