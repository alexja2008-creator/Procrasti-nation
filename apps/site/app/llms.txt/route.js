import { site } from '../../lib/core';
import { APP_URL, CONTACT_EMAIL, SITE_URL } from '../../lib/site';

// /llms.txt: the site in plain Markdown for language models (llmstxt.org), built from the same
// @pn/core words as the landing page so it can't drift from it. Built once, at deploy.
export const dynamic = 'force-static';

export function GET() {
  const text = [
    `# ${site.name}`,
    `> ${site.description}`,
    site.about,
    site.availability,
    `Joining free includes:\n${site.free.map((item) => `- ${item}`).join('\n')}`,
    site.faq.map(({ q, a }) => `**${q}** ${a}`).join('\n\n'),
    [
      '## Links',
      `- [The app](${APP_URL}): where you sign up and use ${site.name}`,
      `- [Home page](${SITE_URL}/): what it does and how`,
      `- [Privacy Policy](${SITE_URL}/privacy): what's stored and who processes it`,
      `- [Terms of Use](${SITE_URL}/terms)`,
      ...(CONTACT_EMAIL ? [`- Contact: ${CONTACT_EMAIL}`] : []),
    ].join('\n'),
  ].join('\n\n');
  return new Response(`${text}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
