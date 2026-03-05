'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';

export default function RelatoriosEntryPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020617',
        color: '#e5e7eb',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(15,23,42,0.9)',
          borderRadius: 20,
          border: '1px solid rgba(148,163,184,0.35)',
          padding: '2.25rem 2rem',
          boxShadow: '0 24px 80px rgba(15,23,42,0.8)',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 16,
              background:
                'linear-gradient(135deg, #0ea5e9 0%, #6366f1 45%, #a855f7 100%)',
              boxShadow: '0 18px 40px rgba(59,130,246,0.5)',
            }}
          >
            <Lock size={26} color="#f9fafb" />
          </div>
        </div>

        <h1
          style={{
            margin: 0,
            marginBottom: '0.5rem',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#f9fafb',
          }}
        >
          Sessão Protegida
        </h1>
        <p
          style={{
            margin: 0,
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            color: '#9ca3af',
          }}
        >
          RTEC Operations Center
        </p>

        <Link
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.5rem',
            borderRadius: 999,
            background:
              'linear-gradient(135deg, #22c55e 0%, #16a34a 40%, #22c55e 100%)',
            color: '#ecfdf3',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 12px 30px rgba(22,163,74,0.45)',
          }}
        >
          Acessar NOC
        </Link>

        <p
          style={{
            marginTop: '1.5rem',
            marginBottom: 0,
            fontSize: '0.8rem',
            color: '#6b7280',
          }}
        >
          Restrito a operadores autorizados.
        </p>
      </div>
    </main>
  );
}
