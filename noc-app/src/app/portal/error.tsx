'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function PortalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest = typeof props.error.digest === 'string' ? props.error.digest : null;

  return (
    <main
      style={{
        alignItems: 'center',
        background: '#0b1121',
        color: '#fff',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}
    >
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          borderRadius: '24px',
          maxWidth: '620px',
          padding: '2rem',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: 'rgba(248, 113, 113, 0.12)',
            borderRadius: '16px',
            color: '#fca5a5',
            display: 'inline-flex',
            height: '56px',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            width: '56px',
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 0.75rem' }}>
          Portal temporariamente indisponivel
        </h1>
        <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
          Ocorreu uma falha ao carregar esta pagina. Se o problema persistir, envie o codigo abaixo para o suporte.
        </p>

        {digest
          ? (
              <div style={{ color: '#64748b', fontFamily: 'Consolas, monospace', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Codigo:
                {' '}
                {digest}
              </div>
            )
          : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            onClick={() => props.reset()}
            style={{
              alignItems: 'center',
              background: 'linear-gradient(135deg, #2d82cc, #4db8ff)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              display: 'inline-flex',
              fontWeight: 800,
              gap: '0.55rem',
              padding: '0.85rem 1.15rem',
            }}
            type="button"
          >
            <RotateCcw size={18} />
            Tentar novamente
          </button>

          <Link
            href="/portal/login"
            style={{
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '12px',
              color: '#cbd5e1',
              fontWeight: 800,
              padding: '0.85rem 1.15rem',
              textDecoration: 'none',
            }}
          >
            Ir para login
          </Link>

          <a
            href="https://wa.me/message/J4U5D52DAZMED1"
            rel="noreferrer"
            style={{
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '12px',
              color: '#cbd5e1',
              fontWeight: 800,
              padding: '0.85rem 1.15rem',
              textDecoration: 'none',
            }}
            target="_blank"
          >
            Falar com o suporte
          </a>
        </div>
      </div>
    </main>
  );
}
