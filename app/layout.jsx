import './globals.css';
import { ThemeProvider, AuthProvider } from './providers';
import { Analytics } from '@vercel/analytics/next';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
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
