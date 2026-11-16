// JSON-LD: the site described in schema.org's vocabulary, for search and answer engines
// (docs/plans/shipped/ai-discovery.md). The words come from @pn/core's `site`, the same ones the page
// shows; Google requires FAQ markup to match the visible text.
import { site } from './core';
import { APP_URL, CONTACT_EMAIL, SITE_URL } from './site';

const ORG_ID = `${SITE_URL}/#organization`;

// Who makes it, the site, and the app with what joining costs. On every page.
export function siteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: site.name,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
        ...(CONTACT_EMAIL ? { email: CONTACT_EMAIL } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: site.name,
        url: SITE_URL,
        description: site.description,
        inLanguage: 'en',
        publisher: { '@id': ORG_ID },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#app`,
        name: site.name,
        description: site.description,
        url: APP_URL,
        applicationCategory: 'Productivity',
        // The iPhone app joins this when it's on the App Store.
        operatingSystem: 'Web browser',
        featureList: site.free,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': ORG_ID },
      },
    ],
  };
}

// The Questions section, on the landing page only.
export function faqPage() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#questions`,
    mainEntity: site.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
