import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Тайлан илгээх, үнэлгээ өгөх систем',
  description: 'Тайлан илгээх, үнэлгээ өгөх систем',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body className="bg-background text-text antialiased">{children}</body>
    </html>
  );
}
