import Link from 'next/link';
import Logo from '../Logo';
import { APP_URL } from '../../lib/site';

export default function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
      <Link href="/" aria-label="ProcrastiNation home">
        <Logo size="md" color="var(--ink)" accent="var(--primary-text)" />
      </Link>
      <a
        href={APP_URL}
        className="rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
      >
        Open the app
      </a>
    </header>
  );
}
