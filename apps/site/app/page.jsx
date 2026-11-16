import SiteHeader from '../components/landing/SiteHeader';
import Hero from '../components/landing/Hero';
import StampStrip from '../components/landing/StampStrip';
import HowItWorks from '../components/landing/HowItWorks';
import Features from '../components/landing/Features';
import Tones from '../components/landing/Tones';
import Faq from '../components/landing/Faq';
import Closing from '../components/landing/Closing';
import SiteFooter from '../components/landing/SiteFooter';
import { site } from '../lib/core';
import { SITE_URL } from '../lib/site';

// The canonical address and og:url are this page's own: set in the layout, the legal pages would
// inherit them. A page's openGraph replaces the layout's, so the shared fields are repeated here.
export const metadata = {
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: { title: site.title, description: site.description, siteName: site.name, type: 'website', url: `${SITE_URL}/` },
};

// The v2 landing page (docs/runbooks/launch-2026-10.md, phase 2): what it does, how, and the way in. Sign-in
// and everything else is the app's, at app.procrasti-nation.work.
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <StampStrip />
        <HowItWorks />
        <Features />
        <Tones />
        <Faq />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
