import Link from 'next/link';
import JsonLd from '../JsonLd';
import { site } from '../../lib/core';
import { faqPage } from '../../lib/structuredData';

// Questions, answered in the open: no accordion, so every answer is on the page for a reader, a
// screen reader and a crawler alike. The words are @pn/core's (`site.faq`), and the JSON-LD beside
// them is built from the same list.
export default function Faq() {
  return (
    <section id="questions" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-16 md:px-8">
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16">
        <div className="md:sticky md:top-10 md:self-start">
          <p className="eyebrow">{site.faqEyebrow}</p>
          <h2 className="font-display mt-3 text-4xl leading-tight md:text-5xl">{site.faqTitle}</h2>
        </div>
        <div className="border-t" style={{ borderColor: 'var(--rule)' }}>
          {site.faq.map(({ q, a, link }, i) => (
            <div key={q} className="grid gap-x-6 border-b py-7 sm:grid-cols-[2.5rem_minmax(0,1fr)]" style={{ borderColor: 'var(--rule)' }}>
              <span aria-hidden="true" className="font-mono-pn pt-1.5 text-sm" style={{ color: 'var(--accent)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-display text-2xl leading-snug">{q}</h3>
                <p className="mt-3 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                  {a}
                  {link ? (
                    <>
                      {' '}
                      <Link href={link.href} className="font-semibold hover:underline" style={{ color: 'var(--primary-text)' }}>
                        {link.label}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <JsonLd data={faqPage()} />
    </section>
  );
}
