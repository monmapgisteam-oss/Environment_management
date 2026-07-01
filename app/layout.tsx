import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Тайлан илгээх, үнэлгээ өгөх систем',
  description: 'Тайлан илгээх, үнэлгээ өгөх систем',
};

// Every page is a live, data-backed dashboard, so render on demand rather than
// prerendering at build time. This also avoids exhausting the database
// connection pool while statically generating many DB-querying pages at once.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body className="bg-background text-text antialiased">{children}</body>
    </html>
  );
}
