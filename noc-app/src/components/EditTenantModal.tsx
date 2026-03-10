'use client';

import { Globe, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { updateTenantAction } from '@/app/actions/tenant';

type Props = {
  tenant: {
    id: string;
    is_active: boolean;
    license_key: string;
    logo_url?: string | null;
    name: string;
    portal_slug?: string | null;
    subdomain?: string | null;
    type: string;
    valid_until: string | null;
  };
};

export function EditTenantModal(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleUpdate(formData: FormData) {
    setErrorMsg('');
    setLoading(true);
    const response = await updateTenantAction(formData);
    setLoading(false);
    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        onBlur={event => event.currentTarget.style.backgroundColor = 'rgba(77, 184, 255, 0.1)'}
        onFocus={event => event.currentTarget.style.backgroundColor = 'rgba(77, 184, 255, 0.2)'}
        onMouseOut={event => event.currentTarget.style.backgroundColor = 'rgba(77, 184, 255, 0.1)'}
        onMouseOver={event => event.currentTarget.style.backgroundColor = 'rgba(77, 184, 255, 0.2)'}
        style={{
          alignItems: 'center',
          backgroundColor: 'rgba(77, 184, 255, 0.1)',
          border: '1px solid rgba(77, 184, 255, 0.3)',
          borderRadius: '6px',
          color: 'var(--accent-primary)',
          cursor: 'pointer',
          display: 'inline-flex',
          fontSize: '0.8rem',
          fontWeight: 600,
          gap: '0.3rem',
          padding: '0.3rem 0.7rem',
          transition: 'all 0.2s',
        }}
        title="Editar tenant"
        type="button"
      >
        <Pencil size={13} />
        Editar
      </button>
    );
  }

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
        zIndex: 100,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          maxHeight: '90vh',
          maxWidth: '560px',
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
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Editar tenant
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{props.tenant.name}</p>
          </div>
          <button
            onClick={() => !loading && setIsOpen(false)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer' }}
            type="button"
          >
            <X size={22} />
          </button>
        </div>

        <form action={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
          <input name="id" type="hidden" value={props.tenant.id} />

          {errorMsg
            ? (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', padding: '0.75rem' }}>
                  {errorMsg}
                </div>
              )
            : null}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Nome do tenant</span>
            <input
              defaultValue={props.tenant.name}
              name="name"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.6rem' }}
              type="text"
            />
          </label>

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Tipo</span>
              <select
                defaultValue={props.tenant.type}
                name="type"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.6rem' }}
              >
                <option value="empresa_ti">Empresa / TI gerenciado</option>
                <option value="camara">Camara municipal</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Status</span>
              <select
                defaultValue={props.tenant.is_active ? 'true' : 'false'}
                name="is_active"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.6rem' }}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Chave da licenca</span>
            <input
              defaultValue={props.tenant.license_key}
              name="license_key"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.6rem' }}
              type="text"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Slug do portal</span>
            <div style={{ alignItems: 'stretch', display: 'flex' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px 0 0 8px', borderRight: 'none', color: 'var(--text-muted)', padding: '0.6rem' }}>
                <Globe size={18} />
              </div>
              <input
                defaultValue={props.tenant.portal_slug ?? props.tenant.subdomain ?? ''}
                name="portal_slug"
                placeholder="ouvidor"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: 'none', borderRight: 'none', color: 'var(--text-primary)', flex: 1, padding: '0.6rem' }}
                type="text"
              />
              <div style={{ backgroundColor: 'var(--border-color)', borderRadius: '0 8px 8px 0', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, padding: '0.6rem' }}>
                /portal/slug
              </div>
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Logo URL</span>
            <input
              defaultValue={props.tenant.logo_url ?? ''}
              name="logo_url"
              placeholder="https://..."
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.6rem' }}
              type="text"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Validade da licenca</span>
            <input
              defaultValue={props.tenant.valid_until ? props.tenant.valid_until.slice(0, 10) : ''}
              name="valid_until"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.6rem' }}
              type="date"
            />
          </label>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              disabled={loading}
              onClick={() => setIsOpen(false)}
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, padding: '0.6rem 1.25rem' }}
              type="button"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              style={{ backgroundColor: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: loading ? 'wait' : 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1, padding: '0.6rem 1.25rem' }}
              type="submit"
            >
              {loading ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
