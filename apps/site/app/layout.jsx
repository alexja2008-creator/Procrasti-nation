import './globals.css';
import { Analytics } from '@vercel/analytics/next';

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=IBM+Plex+Mono&family=Instrument+Sans:wght@400;600&family=Space+Grotesk:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
