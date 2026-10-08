import type { Metadata } from 'next';
import './globals.css';
import { VisualSettingsProvider } from '@/components/settings/VisualSettings';

export const metadata: Metadata = {
  title: 'KamandChat — IIT Mandi Intracampus Network',
  description: 'An elegant intracampus real-time chat application for IIT Mandi students across North and South Campuses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body><VisualSettingsProvider>{children}</VisualSettingsProvider></body>
    </html>
  );
}
