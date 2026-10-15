import SiteHeader from '../components/landing/SiteHeader';
import Hero from '../components/landing/Hero';
import StampStrip from '../components/landing/StampStrip';
import HowItWorks from '../components/landing/HowItWorks';
import Features from '../components/landing/Features';
import Tones from '../components/landing/Tones';
import Closing from '../components/landing/Closing';
import SiteFooter from '../components/landing/SiteFooter';

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
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
