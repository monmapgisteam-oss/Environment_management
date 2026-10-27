import type { Metadata } from 'next';
import './globals.css';
import { themeScript } from '@/lib/theme/themeScript';

export const metadata: Metadata = {
  title: 'Байгаль орчны менежментийн төлөвлөгөөний систем',
  description: 'Байгаль орчны менежментийн төлөвлөгөөний систем',
};

// Every page is a live, data-backed dashboard, so render on demand rather than
// prerendering at build time. Convex records are fetched on each request.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The theme script sets `dark` on <html> before React loads, hence the
    // hydration warning opt-out.
    <html lang="mn" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background text-text antialiased">{children}</body>
    </html>
  );
}
