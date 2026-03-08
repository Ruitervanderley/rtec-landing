'use client';

import { Globe, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { updateTenantAction } from '@/app/actions/tenant';

type Props = {
  tenant: {
    id: string;
    name: string;
    subdomain?: string | null;
    is_active: boolean;
    valid_until: string | null;
  };
};

export function EditTenantModal({ tenant }: Props) {
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
        title="Editar Tenant"
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.3rem 0.7rem',
          backgroundColor: 'rgba(77, 184, 255, 0.1)',
          color: 'var(--accent-primary)',
          border: '1px solid rgba(77, 184, 255, 0.3)',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(77, 184, 255, 0.2)'}
        onFocus={e => e.currentTarget.style.backgroundColor = 'rgba(77, 184, 255, 0.2)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(77, 184, 255, 0.1)'}
        onBlur={e => e.currentTarget.style.backgroundColor = 'rgba(77, 184, 255, 0.1)'}
      >
        <Pencil size={13} />
        Editar
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
    }}
    >
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Editar Tenant
            </h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tenant.name}</p>
          </div>
          <button onClick={() => !loading && setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer' }} type="button">
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form action={handleUpdate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <input type="hidden" name="id" value={tenant.id} />

          {errorMsg && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          {/* Subdomain */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Subdomínio SaaS
            </span>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <div style={{ padding: '0.6rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '8px 0 0 8px', color: 'var(--text-muted)' }}>
                <Globe size={18} />
              </div>
              <input
                type="text"
                name="subdomain"
                defaultValue={tenant.subdomain ?? ''}
                placeholder="ouvidor"
                style={{ flex: 1, padding: '0.6rem', border: '1px solid var(--border-color)', borderLeft: 'none', borderRight: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <div style={{ padding: '0.6rem', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)', borderRadius: '0 8px 8px 0', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                .rtectecnologia.com.br
              </div>
            </div>
          </label>

          {/* Status */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Status</span>
            <select
              name="is_active"
              defaultValue={tenant.is_active ? 'true' : 'false'}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
            >
              <option value="true">✅ Ativo</option>
              <option value="false">🚫 Inativo</option>
            </select>
          </label>

          {/* Valid Until */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Validade da Licença</span>
            <input
              type="date"
              name="valid_until"
              defaultValue={tenant.valid_until ? tenant.valid_until.slice(0, 10) : ''}
              style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </label>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsOpen(false)} disabled={loading} style={{ padding: '0.6rem 1.25rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ padding: '0.6rem 1.25rem', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
