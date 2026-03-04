'use client';

import { useState } from 'react';
import { authenticate } from '../actions/auth';
import { Lock, ArrowRight, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(formData: FormData) {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authenticate(formData);
      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
      }
    } catch (e) {
      // In Next.js Server Actions, 'redirect' throws a specific error we shouldn't catch.
      // Easiest is to check if it's the NEXT_REDIRECT error.
      if (e instanceof Error && e.message.includes('NEXT_REDIRECT')) {
        throw e;
      }
      setErrorMsg('Ocorreu um erro no servidor.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1121' }}>
      
      {/* Visual flair - glowing orb background */}
      <div style={{ position: 'absolute', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(77, 184, 255, 0.1) 0%, rgba(11, 17, 33, 0) 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />

      <div style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '3rem', 
        backgroundColor: '#ffffff', 
        borderRadius: '24px', 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        
        <img src="/logo.png" alt="R.TEC Logo" style={{ height: '56px', marginBottom: '2rem' }} />

        <div style={{ width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Sessão Protegida</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>RTEC Operations Center</p>
        </div>

        {errorMsg && (
          <div style={{ width: '100%', padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 500 }}>
            <AlertTriangle size={16} />
            {errorMsg}
          </div>
        )}

        <form action={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <Lock size={18} />
            </div>
            <input 
              name="password"
              type="password" 
              placeholder="Senha Mestra" 
              required
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 3rem',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4db8ff'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2d82cc 0%, #4db8ff 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              opacity: loading ? 0.7 : 1,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: '0 4px 14px 0 rgba(77, 184, 255, 0.39)',
            }}
            onMouseOver={(e) => !loading && ((e.currentTarget.style.transform = 'translateY(-2px)'), (e.currentTarget.style.boxShadow = '0 6px 20px rgba(77, 184, 255, 0.4)'))}
            onMouseOut={(e) => !loading && ((e.currentTarget.style.transform = 'translateY(0)'), (e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(77, 184, 255, 0.39)'))}
          >
            {loading ? 'Verificando...' : 'Acessar NOC'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          Restrito a operadores autorizados.
        </p>
      </div>
    </div>
  );
}
