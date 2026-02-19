import './globals.css';
import { ThemeProvider, AuthProvider } from './providers';

export const metadata = {
  title: 'ProcrastiNation - Stop Waiting, Start Doing',
  description: 'The intelligent productivity tool that breaks down your biggest tasks into achievable steps.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
