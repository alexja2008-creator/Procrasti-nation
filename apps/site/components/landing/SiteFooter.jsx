import Link from 'next/link';
import Logo from '../Logo';
import { APP_URL, CONTACT_EMAIL } from '../../lib/site';

export default function SiteFooter() {
  return (
    <footer className="border-t" style={{ borderColor: 'var(--rule)' }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <Logo size="sm" color="var(--ink)" accent="var(--primary-text)" />
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          <a href={APP_URL} className="hover:underline">Open the app</a>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          {CONTACT_EMAIL ? (
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">{CONTACT_EMAIL}</a>
          ) : null}
        </nav>
        <p className="eyebrow">© {new Date().getFullYear()} PROCRASTINATION</p>
      </div>
    </footer>
  );
}
