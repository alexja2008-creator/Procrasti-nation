import Link from 'next/link';
import LegalPage, { Todo } from '../../components/legal/LegalPage';
import { CONTACT_EMAIL } from '../../lib/site';

export const metadata = { title: 'Terms · ProcrastiNation' };

// A draft until Alex has it reviewed (lib/site.js). Paid plans add their own section when they ship.
export default function Terms() {
  const contact = CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <Todo>contact email</Todo>;
  return (
    <LegalPage eyebrow="TERMS OF USE" title="The deal, in plain words." effective={<Todo>date of launch</Todo>}>
      <p>
        These terms are the agreement between you and ProcrastiNation <Todo>legal name</Todo> when you use the app or this
        website. By using them, you agree to these terms and to our <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Who can use it</h2>
      <p>
        You need to be 13 or older <Todo>confirm the minimum age</Todo>, and old enough where you live to agree to these terms
        (or have a parent or guardian agree for you).
      </p>

      <h2>Your passport</h2>
      <ul>
        <li>
          You can start without an account. Until you save your passport with a username and a way to sign in, it lives only on
          that device and browser: signing out or clearing its storage loses it, and we can&rsquo;t bring it back.
        </li>
        <li>Keep your sign-in to yourself. You&rsquo;re responsible for what happens under your account.</li>
        <li>You can delete your passport and everything in it at any time: Settings → Account → Delete your passport.</li>
      </ul>

      <h2>Your stuff stays yours</h2>
      <p>
        Your tasks, notes and plans belong to you. You let us store them and process them only to run the app for you,
        including sending a task to our AI provider when you ask for a plan, as the privacy policy describes.
      </p>

      <h2>About the AI</h2>
      <p>
        Plans, steps, suggested dates and &ldquo;I&rsquo;m stuck&rdquo; ideas are written by AI. They can be wrong, miss something,
        or not fit your situation, so use your judgment and edit freely. They aren&rsquo;t medical, legal, financial or academic
        advice, and they don&rsquo;t replace your teacher&rsquo;s or your school&rsquo;s rules: follow those on how you do your work.
      </p>

      <h2>Use it fairly</h2>
      <ul>
        <li>Don&rsquo;t break the law with it, or use it to harm, harass or deceive anyone.</li>
        <li>Don&rsquo;t try to get around limits (like the number of free plans), get into other people&rsquo;s accounts, or overload or attack the service.</li>
        <li>Don&rsquo;t copy, resell or scrape the app, or use it to build a competing service.</li>
      </ul>
      <p>If someone doesn&rsquo;t, we may limit or close their account.</p>

      <h2>Free, and later Pro</h2>
      <p>
        ProcrastiNation is free to use, with a limit on AI plans (currently two a month). If we offer a paid plan, its price and
        terms will be shown before you buy, and buying through the App Store follows Apple&rsquo;s rules too.
      </p>

      <h2>Changes and availability</h2>
      <p>
        We&rsquo;re improving the app all the time, so features may change or go away. We work to keep it running and your data
        safe, but we can&rsquo;t promise it will always be available or error-free. If we ever shut ProcrastiNation down,
        we&rsquo;ll give you notice and time to download your data.
      </p>

      <h2>The legal part</h2>
      <p>
        The app is provided &ldquo;as is&rdquo;, without warranties of any kind, to the extent the law allows. To the extent the law
        allows, ProcrastiNation isn&rsquo;t liable for indirect or consequential losses, or for missed deadlines, and our total
        liability is limited to what you paid us in the last twelve months (for the free app, nothing). Some places don&rsquo;t allow
        these limits, so they may not apply to you. These terms are governed by the laws of <Todo>state or country</Todo>.
      </p>

      <h2>Changes to these terms</h2>
      <p>If we change these terms in a way that matters, we&rsquo;ll tell you in the app before they take effect. Questions: {contact}.</p>
    </LegalPage>
  );
}
