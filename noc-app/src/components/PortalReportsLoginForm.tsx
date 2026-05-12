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
    <form action={formAction} className="portal-form">
      <input type="hidden" name="slug" value={props.slug} />

      {state.error
        ? (
            <div className="portal-inline-alert portal-inline-alert--error">
              {state.error}
            </div>
          )
        : null}

      <label className="portal-form__field">
        <span className="portal-form__label">Email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="admin@empresa.com.br"
          className="portal-form__input"
        />
      </label>

      <label className="portal-form__field">
        <span className="portal-form__label">Senha</span>
        <input
          name="password"
          type="password"
          required
          placeholder="Sua senha"
          className="portal-form__input"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="portal-button portal-button--primary"
      >
        {isPending ? 'Entrando...' : 'Entrar no portal'}
      </button>
    </form>
  );
}
