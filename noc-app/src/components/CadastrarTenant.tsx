'use client';

import { Building2, Globe, Lock, Mail, Plus, Server, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { provisionTenantAction } from '@/app/actions/tenant';

export function CadastrarTenant() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleProvision(formData: FormData) {
    setErrorMsg('');
    setLoading(true);

    // Simulate slight delay for visual smoothness of provisioning cloud environments
    await new Promise(r => setTimeout(r, 600));

    const res = await provisionTenantAction(formData);

    setLoading(false);

    if (res?.error) {
      setErrorMsg(res.error);
    } else if (res?.success) {
      setIsOpen(false);
      // Optional: show a toast success message here
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 1.25rem',
          backgroundColor: 'var(--accent-primary)',
          color: '#fff',
          borderRadius: '8px',
          border: 'none',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(77, 184, 255, 0.3)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(77, 184, 255, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(77, 184, 255, 0.3)';
        }}
      >
        <Plus size={18} />
        <span style={{ fontSize: '0.9rem' }}>Novo Cliente</span>
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
        maxWidth: '550px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      >

        {/* Header Modal */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--brand-gradient)', borderRadius: '8px', color: '#fff' }}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Novo Cliente / Empresa</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cadastre Prefeituras, Empresas de TI, Postos e muito mais</p>
            </div>
          </div>
          <button onClick={() => !loading && setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Formulário */}
        <form action={handleProvision} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {errorMsg && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Nome da Empresa / Organização</span>
              <input type="text" name="name" placeholder="Ex: Empresa Arruda, Posto JP..." required style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>CNPJ (Opcional)</span>
              <input type="text" name="cnpj" placeholder="00.000.000/0001-00" style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tipo de Cliente</span>
            <select
              name="tenantType"
              required
              style={{
                padding: '0.6rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <option value="empresa_ti">🏢 Empresa / TI Gerenciado</option>
              <option value="camara">🏛️ Câmara Municipal (SaaS)</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Subdomínio SaaS
              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Opcional — só para Software na Nuvem)</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <div style={{ padding: '0.6rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '8px 0 0 8px', color: 'var(--text-muted)' }}>
                <Globe size={18} />
              </div>
              <input type="text" name="subdomain" placeholder="deixe em branco para clientes de TI puro" style={{ flex: 1, padding: '0.6rem', border: '1px solid var(--border-color)', borderLeft: 'none', borderRight: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <div style={{ padding: '0.6rem', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)', borderRadius: '0 8px 8px 0', fontSize: '0.9rem', fontWeight: 500 }}>
                .rtectecnologia.com.br
              </div>
            </div>
          </label>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={16} color="var(--accent-primary)" />
            Conta Máster Administrativa
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Email Oficial (Login)</span>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" name="adminEmail" placeholder="admin@empresa.com.br" required style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
              </div>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Senha Inicial</span>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" name="adminPassword" placeholder="Senha123!@" required style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
              </div>
            </label>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => setIsOpen(false)} disabled={loading} style={{ padding: '0.6rem 1.25rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ padding: '0.6rem 1.25rem', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading
                ? (
                    <>Provisionando...</>
                  )
                : (
                    <>
                      <Server size={18} />
                      Criar Instância
                    </>
                  )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
