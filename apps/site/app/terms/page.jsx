import Link from 'next/link';
import LegalPage from '../../components/legal/LegalPage';
import { CONTACT_EMAIL, LEGAL_EFFECTIVE } from '../../lib/site';

export const metadata = { title: 'Terms of Use · ProcrastiNation' };

// Formal rewrite (Alex, 2026-10-13): disputes go to the New York County courts, no arbitration. A draft
// until Alex has it reviewed (lib/site.js). Section 9 carries Apple's minimum terms for an app's license.
export default function Terms() {
  const contact = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage eyebrow="LEGAL" title="Terms of Use" effective={LEGAL_EFFECTIVE}>
      <p>
        <strong>
          PLEASE READ THESE TERMS OF USE CAREFULLY. BY ACCESSING OR USING THE SERVICES, YOU AGREE TO BE BOUND BY THESE
          TERMS. IF YOU DO NOT AGREE TO THESE TERMS, DO NOT ACCESS OR USE THE SERVICES.
        </strong>
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        These Terms of Use (the “Terms”) constitute a legally binding agreement between you and Alex Anderson, an
        individual doing business as ProcrastiNation, of New York, New York (“ProcrastiNation,” “we,” “us,” or “our”),
        governing your access to and use of the ProcrastiNation website, web application and application for iOS, and
        any related services (collectively, the “Services”). Our <Link href="/privacy">Privacy Policy</Link> is
        incorporated into these Terms by reference.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least thirteen (13) years of age to use the Services. If you are under eighteen (18) years of age,
        or under the age of legal majority where you reside, you may use the Services only with the consent of a parent
        or legal guardian, who agrees to be bound by these Terms on your behalf and is responsible for your use of the
        Services. By using the Services, you represent that you satisfy these requirements.
      </p>

      <h2>3. Accounts</h2>
      <p>
        <strong>3.1 Anonymous Passports.</strong> You may use the Services without registering, in which case we create
        an anonymous account (referred to in the Services as a “passport”) associated with your device or browser. Until
        you save your passport by associating it with a username and a sign-in method, it is accessible only from that
        device or browser. If you sign out of, or clear the storage of, that device or browser before saving your
        passport, the passport and its Content will become permanently inaccessible, and we will be unable to restore
        them.
      </p>
      <p>
        <strong>3.2 Saved Accounts.</strong> You agree to provide accurate information when saving your passport, to keep
        your sign-in credentials confidential, and to notify us promptly of any unauthorized use of your account. You are
        responsible for all activity that occurs under your account.
      </p>
      <p>
        <strong>3.3 Deletion.</strong> You may delete your account and its Content at any time through Settings →
        Account → Delete your passport.
      </p>

      <h2>4. License to Use the Services</h2>
      <p>
        Subject to your compliance with these Terms, we grant you a limited, personal, revocable, non-exclusive,
        non-transferable and non-sublicensable license to access and use the Services for your personal, non-commercial
        use.
      </p>

      <h2>5. Your Content</h2>
      <p>
        <strong>5.1 Ownership.</strong> You retain all rights in the tasks, notes, plans and other content that you
        submit to the Services (“Content”).
      </p>
      <p>
        <strong>5.2 License to Us.</strong> You grant us a worldwide, non-exclusive, royalty-free license to host, store,
        reproduce, process and transmit your Content solely as necessary to operate and provide the Services to you,
        including transmitting Content to our artificial intelligence provider when you request an artificial
        intelligence feature, as described in the Privacy Policy. This license terminates when your Content is deleted
        from the Services.
      </p>
      <p>
        <strong>5.3 Responsibility.</strong> You are solely responsible for your Content, and you represent that you have
        all rights necessary to submit it to the Services.
      </p>

      <h2>6. AI-Generated Output</h2>
      <p>
        <strong>6.1 Nature of Output.</strong> Certain features of the Services use artificial intelligence to generate
        plans, steps, dates and suggestions (“Output”). Output is generated automatically, may be inaccurate, incomplete
        or unsuitable for your circumstances, and may not be unique. You are responsible for evaluating Output and
        exercising your own judgment before relying on it.
      </p>
      <p>
        <strong>6.2 No Professional Advice.</strong> Output does not constitute medical, psychological, legal, financial,
        academic or other professional advice.
      </p>
      <p>
        <strong>6.3 Academic Integrity.</strong> You are solely responsible for complying with the policies of any school,
        instructor or institution that apply to your work, including any policies concerning the use of planning tools or
        artificial intelligence.
      </p>
      <p>
        <strong>6.4 Use of Output.</strong> As between you and us, and to the extent permitted by applicable law, you may
        use Output for any lawful purpose.
      </p>

      <h2>7. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ol>
        <li>use the Services in violation of any applicable law or regulation;</li>
        <li>use the Services to harass, threaten, defraud or harm any person;</li>
        <li>
          circumvent, disable or otherwise interfere with any usage limit, security feature or access control of the
          Services, including any limit on artificial intelligence features;
        </li>
        <li>access, or attempt to access, any account or data other than your own;</li>
        <li>interfere with, disrupt or impose an unreasonable load on the Services or their infrastructure;</li>
        <li>
          copy, modify, reverse engineer, decompile, scrape or create derivative works of the Services, except to the
          extent such restriction is prohibited by applicable law;
        </li>
        <li>sell, resell, sublicense or otherwise commercially exploit the Services; or</li>
        <li>use the Services to develop a competing product or service.</li>
      </ol>

      <h2>8. Fees and Subscriptions</h2>
      <p>
        <strong>8.1 Free Access.</strong> The Services are currently offered free of charge, subject to usage limits,
        including a limit on the number of AI-generated plans available in each period, as described in the Services. We
        may change these limits at any time.
      </p>
      <p>
        <strong>8.2 Paid Subscriptions.</strong> We may offer paid subscriptions. The price, billing period and other
        material terms of any subscription will be presented to you before you purchase it.
      </p>
      <p>
        <strong>8.3 Purchases Through Apple.</strong> Subscriptions purchased through the Apple App Store are billed to
        your Apple Account and are subject to Apple’s terms and conditions. A subscription automatically renews for the
        same period at the then-current price unless it is cancelled at least twenty-four (24) hours before the end of the
        current period, and your Apple Account will be charged for renewal within the twenty-four (24) hours preceding
        the end of the current period. Any free trial converts to a paid subscription at its end unless cancelled at least
        twenty-four (24) hours before it ends. You may manage or cancel a subscription in your Apple Account settings.
        Refunds of App Store purchases are handled by Apple in accordance with its policies. Deleting your account does
        not cancel a subscription purchased through Apple.
      </p>

      <h2>9. Apple App Store Terms</h2>
      <p>If you obtained the iOS application from the Apple App Store, the following additional terms apply:</p>
      <ol>
        <li>
          These Terms are concluded between you and us only, and not with Apple Inc. (“Apple”). We, not Apple, are solely
          responsible for the application and its content.
        </li>
        <li>
          Your license to use the application is limited to use on Apple-branded products that you own or control and as
          permitted by the Usage Rules set forth in the Apple Media Services Terms and Conditions, except that the
          application may be accessed and used by other accounts associated with you through Family Sharing or volume
          purchasing.
        </li>
        <li>
          We are solely responsible for providing any maintenance and support services for the application. Apple has no
          obligation whatsoever to furnish any maintenance and support services with respect to the application.
        </li>
        <li>
          In the event of any failure of the application to conform to any applicable warranty, you may notify Apple, and
          Apple will refund the purchase price, if any, for the application to you. To the maximum extent permitted by
          applicable law, Apple will have no other warranty obligation whatsoever with respect to the application, and
          any other claims, losses, liabilities, damages, costs or expenses attributable to any failure to conform to any
          warranty will be our sole responsibility, to the extent not disclaimed in these Terms.
        </li>
        <li>
          We, not Apple, are responsible for addressing any claims by you or any third party relating to the application
          or your possession and use of it, including (i) product liability claims; (ii) any claim that the application
          fails to conform to any applicable legal or regulatory requirement; and (iii) claims arising under consumer
          protection, privacy or similar legislation.
        </li>
        <li>
          In the event of any third-party claim that the application or your possession and use of it infringes that
          third party’s intellectual property rights, we, not Apple, will be solely responsible for the investigation,
          defense, settlement and discharge of any such claim.
        </li>
        <li>
          You represent and warrant that (i) you are not located in a country that is subject to a United States
          Government embargo, or that has been designated by the United States Government as a “terrorist supporting”
          country; and (ii) you are not listed on any United States Government list of prohibited or restricted parties.
        </li>
        <li>
          Questions, complaints and claims with respect to the application should be directed to us as provided in
          Section 20.
        </li>
        <li>You must comply with any applicable third-party terms of agreement when using the application.</li>
        <li>
          Apple and its subsidiaries are third-party beneficiaries of these Terms, and upon your acceptance of these
          Terms, Apple will have the right (and will be deemed to have accepted the right) to enforce these Terms against
          you as a third-party beneficiary.
        </li>
      </ol>

      <h2>10. Intellectual Property</h2>
      <p>
        The Services, including their software, design, text and graphics and the ProcrastiNation name and logo, but
        excluding your Content, are owned by us or our licensors and are protected by intellectual property laws. Except
        for the license granted in Section 4, these Terms grant you no right, title or interest in the Services. If you
        provide us with suggestions or other feedback, we may use them without restriction or obligation to you.
      </p>

      <h2>11. Third-Party Services</h2>
      <p>
        The Services interoperate with services provided by third parties, including sign-in with Apple or Google and the
        push services of web browsers. Your use of those services is governed by their own terms, and we are not
        responsible for them.
      </p>

      <h2>12. Modification and Discontinuation</h2>
      <p>
        We may modify, suspend or discontinue any part of the Services at any time. If we discontinue the Services in
        their entirety, we will provide reasonable advance notice and an opportunity to export your Content.
      </p>

      <h2>13. Suspension and Termination</h2>
      <p>
        You may stop using the Services at any time. We may suspend or terminate your access to the Services if you
        violate these Terms or if we are required to do so by law. Sections 5.3, 6, 10 and 14 through 20, and any other
        provision that by its nature should survive, will survive any termination of these Terms.
      </p>

      <h2>14. Disclaimer of Warranties</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICES AND ALL OUTPUT ARE PROVIDED “AS IS” AND “AS
        AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED OR STATUTORY, INCLUDING ANY IMPLIED
        WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. WE DO NOT WARRANT
        THAT THE SERVICES WILL BE UNINTERRUPTED, SECURE OR ERROR-FREE, THAT REMINDERS WILL BE DELIVERED, OR THAT ANY OUTPUT
        WILL BE ACCURATE OR RELIABLE.
      </p>

      <h2>15. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL PROCRASTINATION BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, PROFITS OR
        OPPORTUNITIES, OR FOR ANY MISSED DEADLINE, LATE SUBMISSION, OR ACADEMIC, EMPLOYMENT OR OTHER CONSEQUENCE, ARISING
        OUT OF OR RELATING TO THE SERVICES, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE) OR ANY OTHER
        LEGAL THEORY, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT
        OF OR RELATING TO THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS PAID FOR THE SERVICES IN THE TWELVE
        (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM AND (B) FIFTY UNITED STATES DOLLARS (US$50). SOME
        JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES, SO SOME OF THE ABOVE LIMITATIONS MAY
        NOT APPLY TO YOU.
      </p>

      <h2>16. Indemnification</h2>
      <p>
        You agree to indemnify, defend and hold harmless ProcrastiNation from and against any claims, liabilities,
        damages, losses and expenses, including reasonable attorneys’ fees, arising out of or relating to your Content,
        your violation of these Terms, or your violation of any law or of the rights of any third party.
      </p>

      <h2>17. Governing Law and Venue</h2>
      <p>
        These Terms, and any dispute arising out of or relating to them or to the Services, are governed by the laws of
        the State of New York, without regard to its conflict-of-laws principles. Any such dispute shall be brought
        exclusively in the state or federal courts located in New York County, New York, and you and we consent to the
        personal jurisdiction of those courts; provided, however, that either party may bring an individual claim in a
        small claims court of competent jurisdiction.
      </p>

      <h2>18. Changes to These Terms</h2>
      <p>
        We may amend these Terms from time to time. If we make material changes, we will provide notice within the
        Services before the changes take effect. Your continued use of the Services after the effective date of amended
        Terms constitutes your acceptance of them. If you do not agree to amended Terms, you must stop using the Services.
      </p>

      <h2>19. General</h2>
      <p>
        <strong>19.1 Entire Agreement.</strong> These Terms, together with the Privacy Policy, constitute the entire
        agreement between you and us concerning the Services and supersede any prior agreements on that subject.
      </p>
      <p>
        <strong>19.2 Severability.</strong> If any provision of these Terms is held invalid or unenforceable, that
        provision will be enforced to the maximum extent permissible and the remaining provisions will remain in full
        force and effect.
      </p>
      <p>
        <strong>19.3 No Waiver.</strong> Our failure to enforce any right or provision of these Terms will not constitute
        a waiver of that right or provision.
      </p>
      <p>
        <strong>19.4 Assignment.</strong> You may not assign or transfer these Terms without our prior written consent.
        We may assign these Terms in connection with a merger, acquisition or sale of all or part of the Services.
      </p>
      <p>
        <strong>19.5 Force Majeure.</strong> We will not be liable for any delay or failure to perform resulting from
        causes beyond our reasonable control.
      </p>
      <p>
        <strong>19.6 Electronic Communications.</strong> You consent to receive communications from us electronically,
        and you agree that such communications satisfy any legal requirement that they be in writing.
      </p>
      <p>
        <strong>19.7 Headings.</strong> Section headings are for convenience only and have no legal effect.
      </p>

      <h2>20. Contact</h2>
      <p>
        Questions, complaints and claims regarding these Terms or the Services may be directed to Alex Anderson,
        ProcrastiNation, New York, New York, at {contact}.
      </p>
    </LegalPage>
  );
}
