import { SITE_URL } from '../lib/site';

// Everyone may read the site; nobody crawls the API. The AI crawlers are named so the choice is
// written down, not implied: both the ones that fetch a page to answer a question and the ones that
// gather training data (Alex, 2026-11-16: the site is marketing and legal text, and being read is
// how a model comes to know PN exists).
const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'CCBot',
];

export default function robots() {
  const rule = { allow: '/', disallow: '/api/' };
  return {
    rules: [
      { userAgent: '*', ...rule },
      { userAgent: AI_CRAWLERS, ...rule },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
