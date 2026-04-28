import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { ProfileProvider } from '../src/context/ProfileContext';
import '../styles/globals.css';
import '../src/styles/tokens.css';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {}); // silent fail — PWA is an enhancement
    }
  }, []);

  return (
    <ProfileProvider>
      <Component {...pageProps} />
    </ProfileProvider>
  );
}
