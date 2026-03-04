'use client';

import { LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: '100%',
        padding: '0.6rem 1rem',
        borderRadius: '8px',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        background: 'rgba(239, 68, 68, 0.08)',
        color: '#f87171',
        fontSize: '0.85rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <LogOut size={16} />
      Sair do Painel
    </button>
  );
}
