import LegalPage from '../../components/legal/LegalPage';
import { CONTACT_EMAIL, LEGAL_EFFECTIVE } from '../../lib/site';

export const metadata = { title: 'Privacy policy · ProcrastiNation' };

// Written from what the code does (2026-10-12). When a feature changes what's collected or who
// processes it, change this page in the same commit. A draft until Alex has it reviewed (lib/site.js).
// Still to add when they ship: a phone number (texted sign-in codes) and the weekly State of the Union
// email with its one-click unsubscribe.
export default function Privacy() {
  const contact = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage eyebrow="PRIVACY POLICY" title="What we keep, and why." effective={LEGAL_EFFECTIVE}>
      <p>
        ProcrastiNation (&ldquo;we&rdquo;) is an app for planning and starting tasks, on the web at app.procrasti-nation.work and,
        soon, on iPhone. This policy says what information the app collects, what it&rsquo;s used for, who else handles it,
        and what you can do about it. The short version: we keep what the app needs to work, we never sell it, and there
        are no ads or ad trackers. ProcrastiNation is run by Alex Anderson, in New York City.
      </p>

      <h2>What we collect</h2>
      <h3>Your account</h3>
      <ul>
        <li>
          <strong>A passport without an account.</strong> You can start without giving us anything: the app opens an anonymous
          passport, identified only by a random ID.
        </li>
        <li>
          <strong>When you save it:</strong> a username, and your email address (with a password, if you choose one), or the
          email and name Apple or Google share when you sign in with them. Passwords are stored by our database provider as
          salted hashes; we never see them.
        </li>
      </ul>
      <h3>What you put in it</h3>
      <ul>
        <li>Your tasks, plans and their steps, notes, territories, dates, times, repeats and estimates.</li>
        <li>
          Your answers to the Citizenship Application (what you&rsquo;re using it for, your hours, what tends to stop you, the
          tone you like), and your settings, including your time zone.
        </li>
        <li>
          What you do in Start Mode (when you started, for how long, how it ended), the stamps you&rsquo;ve earned and the start
          times you&rsquo;ve declared. A Declaration&rsquo;s signature is drawn on your screen and never stored.
        </li>
      </ul>
      <h3>Reminders</h3>
      <p>
        On iPhone, reminders are scheduled on the device itself. In a browser, if you turn reminders on, we store the
        browser&rsquo;s push subscription (an address at your browser&rsquo;s push service, such as Google&rsquo;s or
        Mozilla&rsquo;s, and its keys) so our server can send them, plus a short log of what was sent so nothing rings twice.
      </p>
      <h3>On your device</h3>
      <p>
        The app keeps your sign-in session and a few preferences in your device&rsquo;s storage (things like a reminder you
        snoozed or a tip you dismissed). It doesn&rsquo;t use advertising cookies. This website counts page visits with Vercel
        Analytics, which doesn&rsquo;t use cookies or follow you to other sites.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To run the app: show your tasks on every device you sign in on, ring your reminders, and keep your passport.</li>
        <li>
          <strong>To make plans with AI.</strong> When you use Plan it, &ldquo;I&rsquo;m stuck&rdquo; or dated steps, we send that
          task&rsquo;s text (its title, notes, deadline, the plan&rsquo;s steps, your answers to its questions), the date and your
          time zone, and the &ldquo;what stops you&rdquo; answer from your application to Anthropic, whose Claude models write the
          plan. Nothing else from your account goes with it. Anthropic&rsquo;s terms for businesses don&rsquo;t let it train its models on what we send.
        </li>
        <li>To count your free plans, and to stop abuse (we log each AI request with its time).</li>
        <li>To email you about your account (sign-in links, confirming your address).</li>
      </ul>
      <p>We don&rsquo;t sell your information, share it for advertising, or use it to train AI models.</p>

      <h2>Who else handles it</h2>
      <p>These companies process information for us, only to run the parts of the app they&rsquo;re named for:</p>
      <ul>
        <li><strong>Supabase:</strong> our database and sign-in, hosted in the United States (Amazon Web Services, in Oregon).</li>
        <li><strong>Vercel:</strong> hosting for this website, the app on the web, and our server.</li>
        <li><strong>Anthropic:</strong> the AI that writes plans, as described above.</li>
        <li><strong>Resend:</strong> sending our emails.</li>
        <li><strong>Apple and Google:</strong> if you sign in with them, and the push services that deliver browser reminders.</li>
      </ul>
      <p>
        We may also disclose information if the law requires it, or to protect people&rsquo;s safety. If ProcrastiNation is ever
        sold or merged, this policy still applies to what we hold, and we&rsquo;ll tell you before anything changes.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li><strong>Download your data:</strong> Settings → Account → Download your data gives you everything in one file.</li>
        <li><strong>Delete your passport:</strong> Settings → Account → Delete your passport removes your account and everything in it from our database right away. We don&rsquo;t keep backups of the database today; if we start, they&rsquo;ll last at most 7 days, so anything deleted is gone from them within a week.</li>
        <li><strong>Change or correct</strong> anything in the app itself, and turn reminders and emails off whenever you like.</li>
        <li>For anything else, including requests under laws like the GDPR or CCPA, write to {contact}.</li>
      </ul>

      <h2>Keeping it safe</h2>
      <p>
        Everything travels encrypted. In our database every row belongs to one person, and the rules that guard it let only
        that person read or change it. No system is perfect; if something ever goes wrong with your information, we&rsquo;ll tell
        you.
      </p>

      <h2>Age</h2>
      <p>ProcrastiNation is for people 13 and older. If you think a younger child has an account, tell us at {contact} and we&rsquo;ll delete it.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, we&rsquo;ll say so in the app before it takes effect. Questions: {contact}.</p>
    </LegalPage>
  );
}
