import React from 'react';
import Head from 'next/head';
import { IndiaPhDPortal } from '../src/components/tabs/IndiaPhDPortal';

export default function IndiaPortalPage() {
  return (
    <>
      <Head>
        <title>India PhD Positions — CareerOS</title>
      </Head>
      <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
        {/* Minimal header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '0 24px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.08em', color: 'white' }}>
            CareerOS Market Intel
          </div>
          <a
            href="/"
            style={{
              fontSize: 11, fontWeight: 700, color: '#94a3b8',
              textDecoration: 'none', padding: '5px 12px',
              background: '#1e293b', borderRadius: 6, border: '1px solid #334155',
            }}
          >
            ← Back to Dashboard
          </a>
        </header>

        {/* Page content */}
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 80px' }}>
          <IndiaPhDPortal />
        </main>
      </div>
    </>
  );
}
