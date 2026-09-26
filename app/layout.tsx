import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Book Listener — Discover Personal-Growth Books Solving Life Problems',
  description: 'Legal free public domain audiobooks & texts, Spotify deep links, and original transformative summaries mapped to real-life challenges.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#FBF9F5] text-[#1A1917] dark:bg-[#0E1117] dark:text-[#F0F6FC]">
        {children}
      </body>
    </html>
  );
}
