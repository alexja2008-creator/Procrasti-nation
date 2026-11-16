import { LEGAL_EFFECTIVE, SITE_URL } from '../lib/site';

// The three pages there are. The legal pages last changed on their effective date.
export default function sitemap() {
  const legalChanged = new Date(`${LEGAL_EFFECTIVE} UTC`);
  return [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified: legalChanged, priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: legalChanged, priority: 0.3 },
  ];
}
