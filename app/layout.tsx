import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import BottomNav from './components/BottomNav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '오늘의 코디',
  description: '전신 사진 한 장으로 나만의 옷장을 만들어보세요',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} antialiased bg-zinc-50`}>
        <div className="mx-auto w-full min-h-screen bg-zinc-50 relative pb-14">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
