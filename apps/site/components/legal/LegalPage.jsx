import SiteHeader from '../landing/SiteHeader';
import SiteFooter from '../landing/SiteFooter';
import { LEGAL_DRAFT } from '../../lib/site';

/** The privacy policy and terms: a title, the date they took effect, and the text. */
export default function LegalPage({ eyebrow, title, effective, children }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8 md:px-8">
        {LEGAL_DRAFT ? (
          <p className="mb-8 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--stamp-terracotta)', color: 'var(--stamp-terracotta)' }}>
            Draft, not yet reviewed.
          </p>
        ) : null}
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display mt-3 text-4xl leading-tight md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>Effective {effective}</p>
        <div className="legal mt-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Something still to decide or confirm before the page is final. */
export function Todo({ children }) {
  return <span className="todo">[{children}]</span>;
}
