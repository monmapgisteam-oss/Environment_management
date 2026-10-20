import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Байгаль орчны менежментийн төлөвлөгөөний систем',
  description: 'Байгаль орчны менежментийн төлөвлөгөөний систем',
};

// Every page is a live, data-backed dashboard, so render on demand rather than
// prerendering at build time. Convex records are fetched on each request.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body className="bg-background text-text antialiased">{children}</body>
    </html>
  );
}
