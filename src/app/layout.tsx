import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/contexts/AppContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'みんなでつくる中国山地 百年会議 会員マップ',
  description:
    '中国山地 百年会議の会員を地図上に可視化したアプリケーションです。会員同士のつながりや交流のきっかけづくりを目的としています。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}>
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-20"
          style={{
            backgroundImage: "url('./img/bg.jpg')",
          }}
        />

        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
