import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { Fraunces, IBM_Plex_Mono, Instrument_Sans, Space_Grotesk } from 'next/font/google';

// The A2 fonts, downloaded at build time and served from the site's own domain, so a visitor's
// browser never contacts Google (a German court fined a site for sending visitors' IP addresses to
// Google Fonts: LG München, 2022). The same weights the old Google Fonts link asked for; Fraunces
// keeps its optical size axis, which next/font only offers with the variable weight.
const fraunces = Fraunces({ subsets: ['latin'], axes: ['opsz'], display: 'swap', variable: '--font-fraunces' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--font-plex-mono' });
const instrumentSans = Instrument_Sans({ subsets: ['latin'], weight: ['400', '600'], display: 'swap', variable: '--font-instrument-sans' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: '700', display: 'swap', variable: '--font-space-grotesk' });
const fontVariables = [fraunces, plexMono, instrumentSans, spaceGrotesk].map((font) => font.variable).join(' ');

const description = 'The AI planner that breaks down the task you\'re avoiding into steps small enough to start today.';

// Safari's toolbar and the phone's status bar area match the night page.
export const viewport = { themeColor: '#161B2E' };

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://procrasti-nation.work'),
  title: 'ProcrastiNation: Stop Waiting, Start Doing',
  description,
  openGraph: {
    title: 'ProcrastiNation',
    description,
    siteName: 'ProcrastiNation',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProcrastiNation',
    description,
  },
};

// The marketing site: no sign-in here (that's the app's, at app.procrasti-nation.work).
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
