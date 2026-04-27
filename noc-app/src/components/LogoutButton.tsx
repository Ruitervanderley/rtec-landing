'use client';

import { LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        className="ops-danger-button"
        type="submit"
      >
        <LogOut size={16} />
        Sair do Painel
      </button>
    </form>
  );
}
