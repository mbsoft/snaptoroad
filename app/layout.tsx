import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Snap-to-Road Map Tool',
  description: 'NextBillion.ai snap-to-road visualization tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
