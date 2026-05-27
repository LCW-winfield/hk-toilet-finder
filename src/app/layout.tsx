import './globals.css';

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'HK Toilet Finder',
  description: 'Find public toilets in Hong Kong with maps, nearest-route guidance, and practical facility tags.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body>
        <header className="site-header">
          <Link href="/" className="site-brand">
            香港搵公廁
          </Link>
          <nav className="site-nav">
            <Link href="/">首頁</Link>
            <Link href="/submit">提交公廁 / 糾錯</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
