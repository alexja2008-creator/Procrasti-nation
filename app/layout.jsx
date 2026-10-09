import './globals.css';
import { ThemeProvider, AuthProvider } from './providers';
import { Analytics } from '@vercel/analytics/next';
import { Space_Grotesk } from 'next/font/google';

// Downloaded at build time and served from our own domain: visitors' browsers never contact Google.
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--font-space-grotesk' });

const description = 'The AI planner that breaks down the task you\'re avoiding into steps small enough to start today.';

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
