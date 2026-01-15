import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Steamboat',
  description: 'Bachelor party event management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="steamboat-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
