import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* ── Viewport (critical for mobile — without this browsers render at 980px) ── */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* ── Web App Manifest ── */}
        <link rel="manifest" href="/manifest.json" />

        {/* ── Theme / Brand ── */}
        <meta name="theme-color" content="#0369a1" />
        <meta name="application-name" content="CareerOS" />
        <meta name="description" content="AI-powered career intelligence for DJ & Pooja" />

        {/* ── Android / Chrome PWA ── */}
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

        {/* ── Apple / iOS ── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CareerOS" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />

        {/* ── Microsoft Tiles ── */}
        <meta name="msapplication-TileColor" content="#0369a1" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
