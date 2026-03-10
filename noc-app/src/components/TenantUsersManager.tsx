'use client';

import type { TenantDetail } from '@/lib/ops-api';
import { AlertCircle, KeyRound, Plus, Trash2, UserCog, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  createTenantUserAction,
  deleteTenantUserAction,
  resetTenantUserPasswordAction,
  updateTenantUserAction,
} from '@/app/actions/tenantUsers';
import { formatDate } from '@/lib/format';

type TenantUser = TenantDetail['users'][number];

function getAccessBadgeColor(status: TenantUser['accessStatus']) {
  if (status === 'active') {
    return 'badge-success';
  }

  if (status === 'tenant_inactive') {
    return 'badge-neutral';
  }

  return 'badge-error';
}

function generatePassword() {
  const seed = crypto.randomUUID().replace(/-/g, '');
  return `${seed.slice(0, 8)}${seed.slice(-4)}!`;
}

function ModalShell(props: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        alignItems: 'center',
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        inset: 0,
        justifyContent: 'center',
        position: 'fixed',
        zIndex: 120,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          maxHeight: '90vh',
          maxWidth: '620px',
          overflow: 'auto',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              {props.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{props.subtitle}</p>
          </div>
          <button
            onClick={props.onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            type="button"
          >
            <X size={22} />
          </button>
        </div>
        <div style={{ padding: '1.5rem' }}>{props.children}</div>
      </div>
    </div>
  );
}

export function TenantUsersManager(props: {
  tenantId: string;
  users: TenantUser[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TenantUser | null>(null);
  const [resetting, setResetting] = useState<TenantUser | null>(null);
  const [deleting, setDeleting] = useState<TenantUser | null>(null);
  const [working, setWorking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleConfirmDelete(user: TenantUser) {
    setErrorMsg('');
    setSuccessMsg('');

    setWorking(true);

    const formData = new FormData();
    formData.set('tenant_id', props.tenantId);
    formData.set('user_id', user.userId);

    const response = await deleteTenantUserAction(formData);
    setWorking(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setDeleting(null);
    setSuccessMsg('Usuario removido com sucesso.');
    router.refresh();
  }

  async function handleCreate(formData: FormData) {
    setWorking(true);
    setErrorMsg('');
    setSuccessMsg('');

    const response = await createTenantUserAction(formData);
    setWorking(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setCreateOpen(false);
    setSuccessMsg('Usuario criado com sucesso.');
    router.refresh();
  }

  async function handleUpdate(formData: FormData) {
    setWorking(true);
    setErrorMsg('');
    setSuccessMsg('');

    const response = await updateTenantUserAction(formData);
    setWorking(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setEditing(null);
    setSuccessMsg('Alteracoes salvas.');
    router.refresh();
  }

  async function handleResetPassword(formData: FormData) {
    setWorking(true);
    setErrorMsg('');
    setSuccessMsg('');

    const response = await resetTenantUserPasswordAction(formData);
    setWorking(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setResetting(null);
    setSuccessMsg('Senha atualizada.');
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ alignItems: 'flex-start', display: 'flex', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.35rem' }}>
            Usuarios do tenant
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Crie e edite usuarios no Supabase (Auth + profiles) diretamente pelo painel.
          </p>
        </div>
        <button
          disabled={working}
          onClick={() => setCreateOpen(true)}
          style={{
            alignItems: 'center',
            backgroundColor: 'var(--accent-primary)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            cursor: working ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            fontWeight: 800,
            gap: '0.5rem',
            opacity: working ? 0.75 : 1,
            padding: '0.7rem 1rem',
          }}
          type="button"
        >
          <Plus size={18} />
          Adicionar usuario
        </button>
      </div>

      {errorMsg
        ? (
            <div style={{ alignItems: 'center', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', display: 'flex', gap: '0.5rem', padding: '0.9rem 1rem' }}>
              <AlertCircle size={18} />
              {errorMsg}
            </div>
          )
        : null}

      {successMsg
        ? (
            <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.18)', borderRadius: '10px', color: '#166534', padding: '0.9rem 1rem' }}>
              {successMsg}
            </div>
          )
        : null}

      <div className="table-wrapper">
        <table className="base-table" style={{ minWidth: 860 }}>
          <thead>
            <tr>
              {['Nome', 'Email', 'Perfil', 'Validade', 'Acesso', 'Acoes'].map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.users.map(user => (
              <tr key={user.userId}>
                <td style={{ fontWeight: 700 }}>{user.displayName || '--'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                <td>{user.isAdmin ? 'Admin' : 'Usuario'}</td>
                <td>{formatDate(user.validUntil)}</td>
                <td>
                  <span className={`badge ${getAccessBadgeColor(user.accessStatus)}`}>
                    {user.accessStatus}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      disabled={working}
                      onClick={() => setEditing(user)}
                      style={{ alignItems: 'center', backgroundColor: 'rgba(77, 184, 255, 0.12)', border: '1px solid rgba(77, 184, 255, 0.25)', borderRadius: '8px', color: 'var(--accent-primary)', cursor: working ? 'not-allowed' : 'pointer', display: 'inline-flex', fontSize: '0.8rem', fontWeight: 800, gap: '0.35rem', padding: '0.3rem 0.75rem' }}
                      type="button"
                    >
                      <UserCog size={15} />
                      Editar
                    </button>
                    <button
                      disabled={working}
                      onClick={() => setResetting(user)}
                      style={{ alignItems: 'center', backgroundColor: 'rgba(250, 204, 21, 0.12)', border: '1px solid rgba(250, 204, 21, 0.25)', borderRadius: '8px', color: '#eab308', cursor: working ? 'not-allowed' : 'pointer', display: 'inline-flex', fontSize: '0.8rem', fontWeight: 800, gap: '0.35rem', padding: '0.3rem 0.75rem' }}
                      type="button"
                    >
                      <KeyRound size={15} />
                      Senha
                    </button>
                    <button
                      disabled={working}
                      onClick={() => setDeleting(user)}
                      style={{ alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', color: '#ef4444', cursor: working ? 'not-allowed' : 'pointer', display: 'inline-flex', fontSize: '0.8rem', fontWeight: 800, gap: '0.35rem', padding: '0.3rem 0.75rem' }}
                      type="button"
                    >
                      <Trash2 size={15} />
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {props.users.length === 0
              ? (
                  <tr>
                    <td colSpan={6} style={{ color: 'var(--text-muted)', padding: '2.5rem', textAlign: 'center' }}>
                      Nenhum usuario encontrado para este tenant.
                    </td>
                  </tr>
                )
              : null}
          </tbody>
        </table>
      </div>

      {createOpen
        ? (
            <ModalShell
              onClose={() => !working && setCreateOpen(false)}
              subtitle="Cria usuario no Supabase Auth e vincula o perfil no tenant."
              title="Adicionar usuario"
            >
              <form action={handleCreate} style={{ display: 'grid', gap: '1rem' }}>
                <input name="tenant_id" type="hidden" value={props.tenantId} />

                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Nome</span>
                  <input name="display_name" placeholder="Nome do usuario" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" />
                </label>

                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>E-mail *</span>
                  <input name="email" placeholder="usuario@camara.gov.br" required style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', padding: '0.65rem' }} type="email" />
                </label>

                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Senha inicial *</span>
                  <input minLength={8} name="password" required style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', padding: '0.65rem' }} type="password" />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Minimo de 8 caracteres.</span>
                </label>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                  <label style={{ display: 'grid', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Validade</span>
                    <input name="valid_until" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', padding: '0.65rem' }} type="date" />
                  </label>
                  <label style={{ alignItems: 'center', color: 'var(--text-primary)', display: 'flex', gap: '0.55rem', marginTop: '1.55rem' }}>
                    <input name="is_admin" type="checkbox" value="true" />
                    Admin
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button disabled={working} onClick={() => setCreateOpen(false)} style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', cursor: working ? 'not-allowed' : 'pointer', fontWeight: 700, padding: '0.65rem 1.15rem' }} type="button">
                    Cancelar
                  </button>
                  <button disabled={working} style={{ backgroundColor: 'var(--accent-primary)', border: 'none', borderRadius: '10px', color: '#fff', cursor: working ? 'wait' : 'pointer', fontWeight: 800, opacity: working ? 0.75 : 1, padding: '0.65rem 1.15rem' }} type="submit">
                    {working ? 'Criando...' : 'Criar usuario'}
                  </button>
                </div>
              </form>
            </ModalShell>
          )
        : null}

      {editing
        ? (
            <ModalShell
              onClose={() => !working && setEditing(null)}
              subtitle={editing.email}
              title="Editar usuario"
            >
              <form action={handleUpdate} style={{ display: 'grid', gap: '1rem' }}>
                <input name="tenant_id" type="hidden" value={props.tenantId} />
                <input name="user_id" type="hidden" value={editing.userId} />

                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Nome</span>
                  <input defaultValue={editing.displayName} name="display_name" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" />
                </label>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                  <label style={{ display: 'grid', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Validade</span>
                    <input defaultValue={editing.validUntil ? editing.validUntil.slice(0, 10) : ''} name="valid_until" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', padding: '0.65rem' }} type="date" />
                  </label>
                  <label style={{ alignItems: 'center', color: 'var(--text-primary)', display: 'flex', gap: '0.55rem', marginTop: '1.55rem' }}>
                    <input defaultChecked={editing.isAdmin} name="is_admin" type="checkbox" value="true" />
                    Admin
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button disabled={working} onClick={() => setEditing(null)} style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', cursor: working ? 'not-allowed' : 'pointer', fontWeight: 700, padding: '0.65rem 1.15rem' }} type="button">
                    Cancelar
                  </button>
                  <button disabled={working} style={{ backgroundColor: 'var(--accent-primary)', border: 'none', borderRadius: '10px', color: '#fff', cursor: working ? 'wait' : 'pointer', fontWeight: 800, opacity: working ? 0.75 : 1, padding: '0.65rem 1.15rem' }} type="submit">
                    {working ? 'Salvando...' : 'Salvar alteracoes'}
                  </button>
                </div>
              </form>
            </ModalShell>
          )
        : null}

      {resetting
        ? (
            <ModalShell
              onClose={() => !working && setResetting(null)}
              subtitle={resetting.email}
              title="Resetar senha"
            >
              <form action={handleResetPassword} style={{ display: 'grid', gap: '1rem' }}>
                <input name="tenant_id" type="hidden" value={props.tenantId} />
                <input name="user_id" type="hidden" value={resetting.userId} />

                <label style={{ display: 'grid', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Nova senha *</span>
                  <input minLength={8} name="password" required style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Minimo de 8 caracteres.</span>
                </label>

                <button
                  disabled={working}
                  onClick={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget.closest('form');
                    const input = form?.querySelector('input[name="password"]') as HTMLInputElement | null;
                    if (input) {
                      input.value = generatePassword();
                    }
                  }}
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', cursor: working ? 'not-allowed' : 'pointer', fontWeight: 800, padding: '0.55rem 0.9rem', justifySelf: 'start' }}
                  type="button"
                >
                  Gerar senha
                </button>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button disabled={working} onClick={() => setResetting(null)} style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', cursor: working ? 'not-allowed' : 'pointer', fontWeight: 700, padding: '0.65rem 1.15rem' }} type="button">
                    Cancelar
                  </button>
                  <button disabled={working} style={{ backgroundColor: 'var(--accent-primary)', border: 'none', borderRadius: '10px', color: '#fff', cursor: working ? 'wait' : 'pointer', fontWeight: 800, opacity: working ? 0.75 : 1, padding: '0.65rem 1.15rem' }} type="submit">
                    {working ? 'Salvando...' : 'Atualizar senha'}
                  </button>
                </div>
              </form>
            </ModalShell>
          )
        : null}

      {deleting
        ? (
            <ModalShell
              onClose={() => !working && setDeleting(null)}
              subtitle={deleting.email}
              title="Excluir usuario"
            >
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.18)', borderRadius: '10px', color: '#ef4444', padding: '0.9rem 1rem' }}>
                  Esta acao remove o usuario do Supabase Auth e do perfil do tenant.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    disabled={working}
                    onClick={() => setDeleting(null)}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', cursor: working ? 'not-allowed' : 'pointer', fontWeight: 800, padding: '0.65rem 1.15rem' }}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={working}
                    onClick={() => handleConfirmDelete(deleting)}
                    style={{ backgroundColor: '#ef4444', border: 'none', borderRadius: '10px', color: '#fff', cursor: working ? 'wait' : 'pointer', fontWeight: 900, opacity: working ? 0.75 : 1, padding: '0.65rem 1.15rem' }}
                    type="button"
                  >
                    {working ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </ModalShell>
          )
        : null}
    </section>
  );
}
