import SiteHeader from '../components/landing/SiteHeader';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import Features from '../components/landing/Features';
import Tones from '../components/landing/Tones';
import Closing from '../components/landing/Closing';
import SiteFooter from '../components/landing/SiteFooter';

// The v2 landing page (PN2-LAUNCH-PLAN.md, phase 2): what it does, how, and the way in. Sign-in
// and everything else is the app's, at app.procrasti-nation.work.
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Tones />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
