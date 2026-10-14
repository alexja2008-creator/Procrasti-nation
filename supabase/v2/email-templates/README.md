# Auth email templates

Supabase sends these through Resend (custom SMTP, sender `passport@procrasti-nation.work`, name `ProcrastiNation`). Its default templates are one line and a link, which spam filters distrust, and its default "Change Email Address" reads "from  to …" for an anonymous passport (no old address). Paste each into **both** projects (staging and production): Authentication → Emails → Templates → the template → Subject, and the HTML into the message body. Keep this folder and the dashboards in step.

| Template in Supabase | File | Subject | Sent when |
|---|---|---|---|
| Magic Link | `magic-link.html` | Your ProcrastiNation sign-in link | "Email me a sign-in link" (existing accounts) |
| Reset Password | `reset-password.html` | Reset your ProcrastiNation password | "Forgot your password?" |
| Change Email Address | `change-email.html` | Confirm your email to save your passport | Save your passport with an email (`sendSaveLink`: an anonymous passport gains an email) |
| Confirm signup | `confirm-signup.html` | Confirm your email for ProcrastiNation | Resending a signup confirmation |

Variables: `{{ .ConfirmationURL }}` (all four) and `{{ .NewEmail }}` (Change Email Address). The links are PKCE: they work once, on the device and browser that asked, which the copy says. If Settings ever lets a saved passport change its email, `change-email.html` needs a second version (it assumes the passport is being saved).
