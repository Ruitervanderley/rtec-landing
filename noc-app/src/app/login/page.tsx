'use client';

import { AlertTriangle, ArrowRight, Lock } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { authenticate } from '@/app/actions/auth';

function LoginContent() {
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(formData: FormData) {
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await authenticate(formData);
      if (response?.error) {
        setErrorMsg(response.error);
        setLoading(false);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error;
      }

      setErrorMsg('Ocorreu um erro no servidor.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        alignItems: 'center',
        backgroundColor: '#0b1121',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      <div
        style={{
          background: 'radial-gradient(circle, rgba(77, 184, 255, 0.1) 0%, rgba(11, 17, 33, 0) 70%)',
          height: '500px',
          left: '50%',
          pointerEvents: 'none',
          position: 'absolute',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
        }}
      />

      <div
        style={{
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '420px',
          padding: '3rem',
          width: '100%',
          zIndex: 1,
        }}
      >
        <Image
          alt="R.TEC Logo"
          height={56}
          priority
          src="/logo.png"
          style={{ height: '56px', marginBottom: '2rem', width: 'auto' }}
          width={180}
        />

        <div style={{ marginBottom: '2rem', textAlign: 'center', width: '100%' }}>
          <h1 style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
            Sessao protegida
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>RTEC Operations Center</p>
        </div>

        {errorMsg
          ? (
              <div
                style={{
                  alignItems: 'center',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  color: '#991b1b',
                  display: 'flex',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                  padding: '0.75rem',
                  width: '100%',
                }}
              >
                <AlertTriangle size={16} />
                {errorMsg}
              </div>
            )
          : null}

        <form action={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          <input name="from" type="hidden" value={searchParams.get('from') ?? ''} />

          <div style={{ position: 'relative' }}>
            <div style={{ color: '#94a3b8', left: '1rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}>
              <Lock size={18} />
            </div>
            <input
              name="password"
              placeholder="Senha mestra"
              required
              style={{
                backgroundColor: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                boxSizing: 'border-box',
                fontSize: '1rem',
                outline: 'none',
                padding: '1rem 1rem 1rem 3rem',
                width: '100%',
              }}
              type="password"
            />
          </div>

          <button
            disabled={loading}
            style={{
              alignItems: 'center',
              background: 'linear-gradient(135deg, #2d82cc 0%, #4db8ff 100%)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 14px 0 rgba(77, 184, 255, 0.39)',
              color: '#ffffff',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              fontSize: '1rem',
              fontWeight: 700,
              gap: '0.75rem',
              justifyContent: 'center',
              opacity: loading ? 0.7 : 1,
              padding: '1rem',
              width: '100%',
            }}
            type="submit"
          >
            {loading ? 'Verificando...' : 'Acessar NOC'}
            {!loading ? <ArrowRight size={18} /> : null}
          </button>
        </form>

        <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2rem' }}>
          Restrito a operadores autorizados.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
