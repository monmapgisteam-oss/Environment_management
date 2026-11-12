import type { Metadata } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import './globals.css';
import { themeScript } from '@/lib/theme/themeScript';

export const metadata: Metadata = {
  title: 'Байгаль орчны менежментийн төлөвлөгөөний систем',
  description: 'Байгаль орчны менежментийн төлөвлөгөөний систем',
};

// Every page is a live, data-backed dashboard, so render on demand rather than
// prerendering at build time. ArcGIS records are fetched on each request.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // This request's script nonce (proxy.ts); the policy allows no other inline script.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    // The theme script sets `dark` on <html> before React loads, hence the
    // hydration warning opt-out.
    <html lang="mn" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background text-text antialiased">{children}</body>
    </html>
  );
}
