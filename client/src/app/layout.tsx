import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const dmSans = localFont({
  src: [
    { path: './fonts/dm-sans-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/dm-sans-500.ttf', weight: '500', style: 'normal' },
    { path: './fonts/dm-sans-600.ttf', weight: '600', style: 'normal' },
    { path: './fonts/dm-sans-700.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'Kamand Chat — IIT Mandi Intracampus Network',
  description: 'An elegant intracampus real-time chat application for IIT Mandi students across North and South Campuses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
