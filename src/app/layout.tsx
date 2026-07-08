import type { Metadata } from 'next';
import Providers from './providers';
import '../index.css';

export const metadata: Metadata = {
  title: 'Techna',
  description: 'School Management System',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}