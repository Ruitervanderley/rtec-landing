'use client';

import type { PortalLoginActionState } from '@/app/actions/portal';
import { useActionState } from 'react';
import { loginPortalAction } from '@/app/actions/portal';

const initialState: PortalLoginActionState = {
  error: null,
};

export function PortalReportsLoginForm(props: {
  slug: string;
}) {
  const [state, formAction, isPending] = useActionState(loginPortalAction, initialState);

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input type="hidden" name="slug" value={props.slug} />

      {state.error
        ? (
            <div
              style={{
                border: '1px solid rgba(248, 113, 113, 0.35)',
                borderRadius: '12px',
                color: '#fca5a5',
                fontSize: '0.9rem',
                padding: '0.9rem 1rem',
              }}
            >
              {state.error}
            </div>
          )
        : null}

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}>Email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="admin@empresa.com.br"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '0.95rem',
            padding: '0.85rem 1rem',
          }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}>Senha</span>
        <input
          name="password"
          type="password"
          required
          placeholder="Sua senha"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '0.95rem',
            padding: '0.85rem 1rem',
          }}
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        style={{
          background: 'linear-gradient(135deg, #2d82cc, #4db8ff)',
          border: 'none',
          borderRadius: '12px',
          color: '#fff',
          cursor: isPending ? 'wait' : 'pointer',
          fontSize: '0.95rem',
          fontWeight: 700,
          padding: '0.9rem 1rem',
        }}
      >
        {isPending ? 'Entrando...' : 'Entrar no portal'}
      </button>
    </form>
  );
}
