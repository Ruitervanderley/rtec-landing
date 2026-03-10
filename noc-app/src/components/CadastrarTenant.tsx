'use client';

import type { ProvisionTenantSuccess } from '@/app/actions/tenant';
import { Building2, Globe, Lock, Mail, Plus, Server, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { provisionTenantAction } from '@/app/actions/tenant';

export function CadastrarTenant() {
  const [errorMsg, setErrorMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProvisionTenantSuccess | null>(null);

  function closeModal() {
    if (loading) {
      return;
    }

    setErrorMsg('');
    setIsOpen(false);
    setLoading(false);
    setResult(null);
  }

  async function handleProvision(formData: FormData) {
    setErrorMsg('');
    setLoading(true);
    setResult(null);

    const response = await provisionTenantAction(formData);
    setLoading(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setResult(response);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          alignItems: 'center',
          backgroundColor: 'var(--accent-primary)',
          border: 'none',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(77, 184, 255, 0.3)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          fontWeight: 600,
          gap: '0.5rem',
          padding: '0.6rem 1.25rem',
        }}
        type="button"
      >
        <Plus size={18} />
        <span style={{ fontSize: '0.9rem' }}>Novo cliente</span>
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
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '560px',
          overflow: 'hidden',
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
          <div style={{ alignItems: 'center', display: 'flex', gap: '0.75rem' }}>
            <div style={{ background: 'var(--brand-gradient)', borderRadius: '8px', color: '#fff', padding: '0.5rem' }}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Novo cliente / empresa
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                Provisiona tenant, admin e rota canonica do portal
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer' }}
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        {result
          ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    borderRadius: '12px',
                    color: '#166534',
                    padding: '1rem',
                  }}
                >
                  Tenant provisionado com sucesso.
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <strong>Tenant ID:</strong>
                    <div style={{ color: 'var(--text-secondary)', fontFamily: 'Consolas, monospace', fontSize: '0.8rem' }}>
                      {result.tenantId}
                    </div>
                  </div>
                  <div>
                    <strong>User ID:</strong>
                    <div style={{ color: 'var(--text-secondary)', fontFamily: 'Consolas, monospace', fontSize: '0.8rem' }}>
                      {result.userId}
                    </div>
                  </div>
                  <div>
                    <strong>Slug do tenant:</strong>
                    <div style={{ color: 'var(--text-secondary)', fontFamily: 'Consolas, monospace', fontSize: '0.8rem' }}>
                      {result.portalSlug || '--'}
                    </div>
                  </div>
                  <div>
                    <strong>Portal canonico:</strong>
                    <div style={{ color: 'var(--text-secondary)', fontFamily: 'Consolas, monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                      {result.portalUrl || '--'}
                    </div>
                  </div>
                </div>

                {result.cloudflareStatus === 'manual_redirect_required'
                  ? (
                      <div
                        style={{
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.22)',
                          borderRadius: '12px',
                          padding: '1rem',
                        }}
                      >
                        <h3 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
                          Regra manual do Cloudflare
                        </h3>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                          <div>
                            <strong>Origem</strong>
                            <div style={{ color: 'var(--text-secondary)', fontFamily: 'Consolas, monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                              {result.redirectSource}
                            </div>
                          </div>
                          <div>
                            <strong>Destino</strong>
                            <div style={{ color: 'var(--text-secondary)', fontFamily: 'Consolas, monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                              {result.redirectTarget}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  : (
                      <div
                        style={{
                          background: 'rgba(148, 163, 184, 0.08)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: '12px',
                          color: 'var(--text-secondary)',
                          fontSize: '0.9rem',
                          padding: '1rem',
                        }}
                      >
                        Este tenant nao exige redirect manual no Cloudflare.
                      </div>
                    )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setResult(null)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '0.6rem 1.25rem',
                    }}
                    type="button"
                  >
                    Cadastrar outro
                  </button>
                  <button
                    onClick={closeModal}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '0.6rem 1.25rem',
                    }}
                    type="button"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )
          : (
              <form action={handleProvision} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
                {errorMsg
                  ? (
                      <div
                        style={{
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          color: '#991b1b',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          padding: '0.75rem',
                        }}
                      >
                        {errorMsg}
                      </div>
                    )
                  : null}

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Nome da empresa
                    </span>
                    <input
                      name="name"
                      placeholder="Ex: Empresa Arruda"
                      required
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.6rem' }}
                      type="text"
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      CNPJ
                    </span>
                    <input
                      name="cnpj"
                      placeholder="00.000.000/0001-00"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.6rem' }}
                      type="text"
                    />
                  </label>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Tipo de cliente
                  </span>
                  <select
                    name="tenantType"
                    required
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.6rem' }}
                  >
                    <option value="empresa_ti">Empresa / TI gerenciado</option>
                    <option value="camara">Camara municipal</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Slug do portal
                  </span>
                  <div style={{ alignItems: 'stretch', display: 'flex' }}>
                    <div
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px 0 0 8px',
                        borderRight: 'none',
                        color: 'var(--text-muted)',
                        padding: '0.6rem',
                      }}
                    >
                      <Globe size={18} />
                    </div>
                    <input
                      name="portal_slug"
                      placeholder="ouvidor"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: 'none', borderRight: 'none', color: 'var(--text-primary)', flex: 1, padding: '0.6rem' }}
                      type="text"
                    />
                    <div
                      style={{
                        backgroundColor: 'var(--border-color)',
                        borderRadius: '0 8px 8px 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        padding: '0.6rem',
                      }}
                    >
                      .rtectecnologia.com.br
                    </div>
                  </div>
                </label>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

                <h3
                  style={{
                    alignItems: 'center',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    gap: '0.4rem',
                    margin: 0,
                  }}
                >
                  <ShieldCheck size={16} color="var(--accent-primary)" />
                  Conta administrativa
                </h3>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Email
                    </span>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ color: 'var(--text-muted)', left: '0.75rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        name="adminEmail"
                        placeholder="admin@empresa.com.br"
                        required
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', boxSizing: 'border-box', color: 'var(--text-primary)', padding: '0.6rem 0.6rem 0.6rem 2.2rem', width: '100%' }}
                        type="email"
                      />
                    </div>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      Senha inicial
                    </span>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ color: 'var(--text-muted)', left: '0.75rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        name="adminPassword"
                        placeholder="Senha123!@"
                        required
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', boxSizing: 'border-box', color: 'var(--text-primary)', padding: '0.6rem 0.6rem 0.6rem 2.2rem', width: '100%' }}
                        type="password"
                      />
                    </div>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    disabled={loading}
                    onClick={closeModal}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1, padding: '0.6rem 1.25rem' }}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={loading}
                    style={{ alignItems: 'center', backgroundColor: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: loading ? 'wait' : 'pointer', display: 'flex', fontWeight: 600, gap: '0.5rem', opacity: loading ? 0.7 : 1, padding: '0.6rem 1.25rem' }}
                    type="submit"
                  >
                    <Server size={18} />
                    {loading ? 'Provisionando...' : 'Criar instancia'}
                  </button>
                </div>
              </form>
            )}
      </div>
    </div>
  );
}
