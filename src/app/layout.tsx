import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import '../index.css';

export const metadata: Metadata = {
  title: 'Techna',
  description: 'School Management System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
