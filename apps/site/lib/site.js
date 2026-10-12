// The marketing site's shared settings.

// Where the app lives. next.config.js sends v1's old pages there too (it keeps its own copy of
// this default, since it's CommonJS). Local development: NEXT_PUBLIC_APP_URL=http://localhost:8081
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.procrasti-nation.work';

// The address in the privacy policy and terms, and the footer (Alex, 2026-10-12).
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'procrasti.nation.marketing@gmail.com';

// When the privacy policy and terms take effect: the launch (tentative, Alex 2026-10-12). Move it with the launch.
export const LEGAL_EFFECTIVE = 'October 25, 2026';

// The privacy policy and terms are drafts until Alex has them reviewed: while this is true they
// say so at the top. Flip it after review. Open questions show as [bracketed] marks (<Todo>).
export const LEGAL_DRAFT = true;
