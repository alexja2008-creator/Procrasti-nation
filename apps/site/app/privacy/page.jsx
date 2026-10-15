import Link from 'next/link';
import LegalPage from '../../components/legal/LegalPage';
import { CONTACT_EMAIL, LEGAL_EFFECTIVE } from '../../lib/site';

export const metadata = { title: 'Privacy Policy · ProcrastiNation' };

// Written from what the code does (2026-10-12; formal rewrite, Alex 2026-10-13). When a feature changes
// what's collected or who processes it, change this page in the same commit. Approved by Alex on
// 2026-10-13. Still to add when they ship: a phone number (texted sign-in codes) and the
// weekly State of the Union email with its one-click unsubscribe.
export default function Privacy() {
  const contact = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage eyebrow="LEGAL" title="Privacy Policy" effective={LEGAL_EFFECTIVE}>
      <p>
        This Privacy Policy describes how Alex Anderson, an individual doing business as ProcrastiNation
        (“ProcrastiNation,” “we,” “us,” or “our”), collects, uses, discloses and otherwise processes information in
        connection with the ProcrastiNation website located at procrasti-nation.work, the ProcrastiNation web
        application located at app.procrasti-nation.work, the ProcrastiNation application for iOS, and any related
        services (collectively, the “Services”). This Privacy Policy is incorporated into, and forms part of, our{' '}
        <Link href="/terms">Terms of Use</Link>. By accessing or using the Services, you acknowledge that you have read
        and understood this Privacy Policy.
      </p>
      <p>
        We do not sell personal information, we do not share personal information for cross-context behavioral
        advertising, and the Services do not display advertisements or use advertising trackers.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        <strong>1.1 Account Information.</strong> You may begin using the Services by providing only the name you would
        like us to use: a first name and, if you choose, a last name. We then create an account for you (referred to in
        the Services as your “passport”) that is identified by a randomly generated identifier. We display your name to
        you within the Services, including on your passport, and we do not display it to other users. You may change it
        in the Services at any time. To save your passport, which we ask you to do before you continue past the
        Citizenship Application, we collect a username and either (a) your email address and, if you choose one, a
        password, or (b) the email address and name made available to us by Apple or Google, if you sign in with that
        provider. At your election, Apple may provide a private relay address in place of your email address. Passwords are stored by our
        database provider in salted and hashed form, and we do not have access to them in readable form.
      </p>
      <p>
        <strong>1.2 Content You Provide.</strong> We collect the content you create or submit through the Services
        (“Content”), including: (a) tasks, plans and their steps, notes, lists (referred to in the Services as
        “territories”), dates, times, recurrence rules and time estimates; (b) your responses to the onboarding
        questionnaire (referred to in the Services as the “Citizenship Application”), including your intended use of the
        Services, the hours during which you typically work, the obstacles you report, your preferred notification tone
        and how you heard about the Services; and (c) your settings, including your time zone.
      </p>
      <p>
        <strong>1.3 Activity Information.</strong> We collect information about your use of certain features, including
        the start time, duration and outcome of focus sessions (referred to in the Services as “Start Mode”), the
        achievements you earn (referred to as “stamps”), and the start times you commit to (referred to as
        “Declarations”). The signature you draw to make a Declaration is displayed on your device only and is not
        transmitted to or stored by us.
      </p>
      <p>
        <strong>1.4 Reminder Information.</strong> On iOS, reminders are scheduled locally on your device. If you enable
        reminders in a web browser, we collect the push subscription issued by your browser, consisting of an endpoint
        address at your browser’s push service and the associated encryption keys, so that our servers may deliver
        reminders to that browser. We also maintain a log of the reminders sent, which is retained for approximately two
        (2) days to prevent duplicate delivery.
      </p>
      <p>
        <strong>1.5 Usage Records.</strong> We record the type and time of each request made to the artificial
        intelligence features of the Services, in order to enforce usage limits and to prevent abuse.
      </p>
      <p>
        <strong>1.6 Technical Information.</strong> Our service providers automatically record technical information when
        you use the Services, such as your IP address, device and browser type, and the date and time of each request,
        in server logs used for security, rate limiting and troubleshooting.
      </p>
      <p>
        <strong>1.7 Device Storage and Analytics.</strong> The Services store your session credentials and certain
        preferences (for example, whether you have dismissed a tip) in your device’s local storage. We do not use
        advertising cookies. Our website measures page visits using Vercel Web Analytics, which does not use cookies and
        does not track you across other websites.
      </p>

      <h2>2. How We Use Information</h2>
      <p>We use the information described in Section 1 to:</p>
      <ol>
        <li>
          provide, operate and maintain the Services, including synchronizing your Content across the devices on which
          you sign in and delivering reminders;
        </li>
        <li>provide the artificial intelligence features of the Services, as described in Section 3;</li>
        <li>
          enforce the usage limits applicable to your account, and detect, prevent and respond to fraud, abuse, security
          incidents and violations of our Terms of Use;
        </li>
        <li>
          send you communications concerning your account, such as sign-in links, address confirmations and
          password-reset messages;
        </li>
        <li>respond to your requests and inquiries; and</li>
        <li>comply with applicable law and legal process.</li>
      </ol>
      <p>We do not use your information to train artificial intelligence models.</p>

      <h2>3. Artificial Intelligence Features</h2>
      <p>
        When you use a feature of the Services that generates plans, steps, dates or suggestions (including the
        features labeled “Plan it” and “I’m stuck”), we transmit to our artificial intelligence provider, Anthropic, only
        the information necessary to fulfill that request, which may include: the title and notes of the relevant task;
        its deadline; the steps of its plan; your responses to any clarifying questions; the reason you select for being
        stuck and any suggestions previously provided for the same step; the current date and your time zone; and the
        obstacle you reported in the Citizenship Application. No other information from your account is transmitted.
        Under Anthropic’s commercial terms, Anthropic does not use information submitted to it through its application
        programming interface to train its models.
      </p>

      <h2>4. How We Disclose Information</h2>
      <p>
        <strong>4.1 Service Providers.</strong> We disclose information to the following service providers, which
        process it on our behalf solely to provide the services indicated:
      </p>
      <ol>
        <li>
          Supabase, for database hosting and authentication; information is stored in the United States, in the Oregon
          region of Amazon Web Services;
        </li>
        <li>Vercel, for hosting the website, the web application and our servers, and for website analytics;</li>
        <li>Anthropic, for the artificial intelligence features described in Section 3;</li>
        <li>Resend, for delivering account emails;</li>
        <li>Apple and Google, for authentication, if you elect to sign in with either of them; and</li>
        <li>
          the push service operated by the vendor of your web browser (such as Google, Mozilla, Microsoft or Apple), for
          delivering browser reminders.
        </li>
      </ol>
      <p>
        <strong>4.2 Legal Requirements and Protection of Rights.</strong> We may disclose information where we believe in
        good faith that disclosure is required by law, regulation or legal process, or is necessary to protect the
        rights, property or safety of any person.
      </p>
      <p>
        <strong>4.3 Business Transfers.</strong> In connection with a merger, acquisition, financing or sale of all or
        part of the Services, information may be transferred to a successor, subject to this Privacy Policy. We will
        notify you before your information becomes subject to a different privacy policy.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain your account information and Content for as long as your account exists. When you delete your
        account, the account and all associated Content are deleted from our production database immediately. We do not
        currently maintain backups of our database; if we do so in the future, backups will be retained for no longer
        than seven (7) days, such that deleted information is removed from them within that period. Anonymous passports
        that are never saved may be deleted after an extended period of inactivity. Reminder logs are retained as
        described in Section 1.4, and our service providers may retain server logs in accordance with their own
        retention policies.
      </p>

      <h2>6. Your Rights and Choices</h2>
      <ol>
        <li>
          <strong>Access and portability.</strong> You may obtain a copy of your account information and Content at any
          time through Settings → Account → Download your data.
        </li>
        <li>
          <strong>Deletion.</strong> You may delete your account and all associated Content at any time through Settings →
          Account → Delete your passport.
        </li>
        <li>
          <strong>Correction.</strong> You may correct or update your Content and settings within the Services.
        </li>
        <li>
          <strong>Reminders.</strong> You may disable reminders at any time within the Services or in the settings of your
          device or browser.
        </li>
        <li>
          <strong>Additional rights.</strong> Depending on where you reside, you may have additional rights under
          applicable law, including the right to request access to, correction of or deletion of your personal
          information, and the right not to be discriminated against for exercising those rights. You may submit a
          request at any time to {contact}. We will verify and respond to requests within the time required by
          applicable law.
        </li>
      </ol>

      <h2>7. Security</h2>
      <p>
        We maintain reasonable administrative, technical and organizational measures designed to protect information,
        including encryption of data in transit and database access controls under which each record is accessible only
        to the account to which it belongs. No method of transmission or storage is completely secure, and we cannot
        guarantee absolute security. In the event of a security incident affecting your personal information, we will
        notify you in accordance with applicable law.
      </p>

      <h2>8. Children’s Privacy</h2>
      <p>
        The Services are not directed to children under the age of thirteen (13), and we do not knowingly collect
        personal information from children under the age of thirteen (13). If we learn that we have collected personal
        information from such a child, we will delete it. If you believe that a child under the age of thirteen (13) has
        provided us with personal information, please contact us at {contact}.
      </p>
      <p>
        Before an account is created, the Services ask for your date of birth to confirm that you meet the minimum age
        set out in our <Link href="/terms">Terms of Use</Link>. Your date of birth is checked on your device and is
        neither stored nor transmitted to us; your device retains only the result of the check. If you do not meet the
        minimum age, no account is created, and an account that has already been created, for example through Apple
        or Google sign-in, is deleted.
      </p>

      <h2>9. Location of Processing</h2>
      <p>
        We are located in the United States, and information is stored and processed in the United States. If you access
        the Services from outside the United States, you acknowledge that your information will be transferred to,
        stored and processed in the United States.
      </p>

      <h2>10. Changes to This Privacy Policy</h2>
      <p>
        We may amend this Privacy Policy from time to time. If we make material changes, we will provide notice within
        the Services before the changes take effect. The effective date above indicates when this Privacy Policy was
        last revised. Your continued use of the Services after the effective date of an amended Privacy Policy
        constitutes your acknowledgment of it.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions, requests and complaints regarding this Privacy Policy may be directed to Alex Anderson,
        ProcrastiNation, New York, New York, at {contact}.
      </p>
    </LegalPage>
  );
}
