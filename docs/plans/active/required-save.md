# Plan: Saving the passport is required

**Status: approved 2026-10-15.** Alex answered the open questions (below) and phase 1 started. He approves the legal wording in the PR.

## Overview

Four family members tried the web app on 2026-10-14. Three of them left with unsaved passports. Two tapped Later on Save your passport, half paying attention. The third sent the email link and never opened it; the email went out under Supabase's default subject, "Confirm Email Change", which reads like phishing. An unsaved passport exists only in one browser, and nobody can reach its owner again. Students will do what these testers did.

This plan makes saving the last step of the Application, with no Later. Sending the link is enough to carry on, so nobody waits on their inbox. Until the email is confirmed, the address stays in front of them on Today, with a way to send the link again or fix a typo.

## Before this ships (Alex, in Supabase)

- **Production's Change Email Address template:** the subject is still Supabase's default. Set the subject to "Confirm your email to save your passport" and the body to `supabase/v2/email-templates/change-email.html`. Check the other three templates against `supabase/v2/email-templates/README.md`, and check staging's templates too. Requiring an email gets nobody saved if the email looks like phishing.

## Decisions (Alex, 2026-10-15)

1. **No Later.** Save your passport is the last page of the Application. For an unsaved passport, it's the only way into Today. Sending the link is enough to carry on; confirming it isn't required. That keeps `DECISIONS.md`'s rule that nobody waits on an email. Texted codes and Apple join as ways to save when they're turned on.
2. **Skip skips the questions, not saving.** On the Application's Welcome, Skip takes an unsaved passport to Save your passport instead of Today. Apple and Google accounts are already saved, so nothing changes for them. In practice an unsaved passport only sees Skip when its answers failed to move from the device.
3. **Passports already past the Application unsaved** see Save your passport the next time they open the app. There are three on production today.
4. **Coming back resumes at Save.** Today, someone who leaves on Approved or Save starts again at the Oath (`resumePage`), so they'd be asked for the Oath twice and a second plan would use up a second free plan. Once the passport holds a plan, the Application resumes after the Oath.
5. **"Sign in instead" on the save page.** If their email already has a passport (`email_exists` → "There's already a passport for that email…"), the page offers Sign in. They see the existing warning that signing out of an unsaved passport loses it. With no Later, they'd be stuck without this.
6. **When sending fails on our side, let them in.** If Supabase or Resend can't send (a server error, not a bad address or "too many tries"), the person goes on to Today for this run of the app, and Save your passport comes back the next time they open it. A mail outage must never lock new people out of the app.
7. **Until it's confirmed, a card on Today** (not only on Passport): "Check your email", the address, **Send it again**, **Use a different email**, and a line about the spam folder. Quiet, no red, no guilt. Passport and Settings show the same state.
8. **The iPhone gets the same rule.** Apple's guideline 5.1.1(v) asks that apps without "significant account-based features" work without a login, and that apps not require personal information unless the core function needs it. PN syncs across the phone and the web, which is the case for an account. The anonymous passport still gets people through the whole Application and the Oath before asking. Before App Store review, **Sign in with Apple becomes the first way to save on the iPhone** (one tap, and Hide My Email avoids sharing an address). That needs the Apple provider on production and the Sign in with Apple key, both already open items in `STATUS.md`, plus "Allow manual linking" in Supabase Auth: `linkIdentity` with Apple's ID token, which supabase-js 2.117 has, attaches it to the anonymous passport. If App Review still objects, Later comes back on the iPhone only (one line); the web keeps the rule.
9. **Legal, in the same PR:** privacy policy §1.1 ("If you elect to save your passport…") and Terms §3.1 ("You may use the Services without registering…") describe saving as optional. Both are rewritten (drafts below), Alex approves them, and `LEGAL_EFFECTIVE` moves to the ship date.
10. **`DECISIONS.md`** ("Accounts and sign-in": "They save it later") and `conversion.md`'s decision 5 ("Later is allowed; it comes back") are marked as replaced by this plan.

**Answered (Alex, 2026-10-15):**
- **The Today card can't be dismissed.** It stays until the email is confirmed: one line and a button.
- **The full save page doesn't come back for an unconfirmed email, for now.** Measure first with the query under Data, then decide.
- **The iPhone gets the rule in the same release as the web.** Typing an email works there today, and the students are mostly on iPhone. Apple sign-in is added before App Store review (decision 8).

## Files to create or modify

| File | Action | What changes |
|---|---|---|
| `packages/core/src/onboarding.ts` | Modify | `resumePage` resumes after the Oath once a plan exists, and at `save` for an unsaved passport with no link sent |
| `packages/core/test/onboarding.test.ts` | Modify | Cases for those resumes |
| `packages/core/src/nation.ts` | Modify | Remove the Application's `later`; add copy for Sign in instead, the "couldn't send" fallback and the Today card |
| `apps/app/src/app/_layout.tsx` | Modify | The gate keeps an unsaved passport with no link sent on the Application (its Save page) even when the Application is done |
| `apps/app/src/app/welcome.tsx` | Modify | No `onLater`; Skip goes to Save for an unsaved passport; resume after the Oath |
| `apps/app/src/components/save-passport.tsx` | Modify | `onLater` goes; Sign in instead; let them in when sending fails on our side |
| `apps/app/src/auth/passport.ts` | Modify | `resendSaveLink` (`auth.resend({ type: 'email_change' })`); `pendingEmail(user)` from `user.new_email` |
| `apps/app/src/hooks/use-passport-status.ts` | Modify | Exposes the pending email |
| `apps/app/src/components/passport-save-card.tsx` | Modify | The pending state (address, Send it again, Use a different email); usable on Today |
| `apps/app/src/app/(tabs)/index.tsx` | Modify | The card on Today while the passport is unsaved or the email is waiting |
| `apps/site/app/privacy/page.jsx`, `apps/site/app/terms/page.jsx`, `apps/site/lib/site.js` | Modify | §1.1, §3.1, `LEGAL_EFFECTIVE` |
| `DECISIONS.md`, `docs/plans/active/conversion.md`, `docs/architecture.md` | Modify | The rule changes (decision 10); the auth paragraph |

## Phases

**Phase 1: the requirement** (one PR, with the legal text):
- Core: `resumePage` and its tests; copy.
- The gate, the Application (no Later, Skip, resume), the save page (Sign in instead, letting them in when sending fails).
- Privacy policy, Terms, `DECISIONS.md`, `conversion.md`.
- **Checked by Claude:** `npm run core:test`, `npm run app:check`, the site build; the signed-out Application in the browser pane at phone and laptop width, day and night, as far as the passport opening (Claude doesn't create accounts on staging).
- **Needs Alex, on staging** (the local app at `127.0.0.1:8081`, as for the launch check): a new passport through the Oath reaches Save with no Later. Sending the link goes on to Today. Leaving on Save and reloading comes back to Save, not the Oath. An email that already has a passport shows Sign in instead. An existing unsaved passport (made before the change) opens on Save. The iPhone through a staging TestFlight build or the Simulator: the same Save page.

**Phase 2: until it's confirmed** (one PR):
- The Today card, and the same pending state on Passport and in Settings: Send it again, Use a different email, the spam line.
- **Checked by Claude:** the tests and type check; the card's layout at phone and laptop width, day and night.
- **Needs Alex, on staging:** Send it again delivers a second email. Use a different email replaces the pending address. Opening the link (on another device too) clears the card and offers Choose a password.

**Phase 3: Sign in with Apple to save, on the iPhone** (before App Store review; waits on the Apple provider and key from `STATUS.md`): `linkIdentity` with the ID token on the save page, first in the list on the iPhone.

## Data and copy

- **No schema change.** "Link sent" is `user.new_email`, which Supabase sets when the save link goes out; "saved" is `is_anonymous = false`. The resume check reads the passport's tasks, which are already loaded.
- **Measuring the change** (production SQL Editor; no addresses shown). The third group is people who stopped at Save your passport:

```sql
select
  case
    when not u.is_anonymous then 'saved'
    when coalesce(u.email_change, '') <> '' then 'link sent, not opened'
    when s.onboarding_completed_at is null
      and exists (select 1 from tasks t where t.user_id = u.id) then 'stopped at Save'
    else 'unsaved, other'
  end as state,
  count(*)
from auth.users u
left join user_settings s on s.user_id = u.id
where u.created_at > '<ship date>'
group by 1;
```

- **Copy drafts** (`nation.ts`, no-guilt voice):
  - Sign in instead: "Already have a passport? Sign in"
  - Couldn't send: "We couldn't send the link just now. Carry on, and we'll ask again next time you open ProcrastiNation."
  - Today card: "Check your email" / "We sent a link to {email}. Open it to save your passport. Not there? Check spam, or send it again." / **Send it again** / **Use a different email**
- **Privacy policy §1.1, draft:** "You may begin using the Services by providing only the name you would like us to use… Before you continue past the Citizenship Application, you save your passport by providing a username and either (a) your email address and, if you choose one, a password, or (b) the email address and name made available to us by Apple or Google…"
- **Terms §3.1, draft:** "You may answer the Citizenship Application without registering, in which case we create an anonymous account… To continue using the Services after the Application, you save your passport by associating it with a username and a sign-in method. Until the sign-in method is confirmed, your passport is accessible only from the device or browser where you created it…"

## Risks

- **More people leave at the save page.** Today they leave just after it, unsaved and unreachable, so the loss is mostly made visible rather than new. The query above shows it. If "stopped at Save" outnumbers "link sent", revisit Q2 and the copy before anything else.
- **A mail outage blocks new people.** Decision 6 lets them in when sending fails on our side.
- **An email that already has a passport.** Decision 5.
- **Fake or mistyped addresses** get past the page. The card stays until the email is confirmed (Use a different email), which is no worse than Later.
- **App Review (5.1.1(v)).** Sign in with Apple first; the fallback is Later on the iPhone only.
- **The email lands in spam** (Yahoo, Gmail's Promotions tab). Fix the template subject first; the card says to check spam and offers Send it again.

## Done when

- [ ] Production's Change Email Address template has our subject and body (Alex).
- [ ] A new passport can't reach Today without sending a save link, on the web and the iPhone.
- [ ] Skip on the Application's Welcome takes an unsaved passport to Save.
- [ ] An unsaved passport made before the change opens on Save.
- [ ] Leaving on Save and coming back resumes at Save, not the Oath.
- [ ] An email that already has a passport offers Sign in instead.
- [ ] A failed send on our side lets them into Today, with the card.
- [ ] Today shows the waiting email until it's confirmed; Send it again and Use a different email work.
- [ ] Privacy policy §1.1 and Terms §3.1 match, approved by Alex; `LEGAL_EFFECTIVE` is the ship date.
- [ ] `DECISIONS.md`, `conversion.md` and `docs/architecture.md` say the new rule.
