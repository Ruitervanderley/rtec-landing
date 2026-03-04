'use client';

import { useState } from 'react';
import { Building2, FileText, Calendar, Clock, Download, LogIn, Lock, Mail, ArrowLeft } from 'lucide-react';

export default function RelatoriosPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Mock session data for demo
  const sessions = [
    { id: 1, title: 'Sessão Ordinária #42', date: '2026-03-01', duration: '2h 15min', status: 'Concluída' },
    { id: 2, title: 'Sessão Extraordinária #5', date: '2026-02-25', duration: '1h 40min', status: 'Concluída' },
    { id: 3, title: 'Sessão Ordinária #41', date: '2026-02-22', duration: '3h 05min', status: 'Concluída' },
    { id: 4, title: 'Audiência Pública - Orçamento', date: '2026-02-18', duration: '4h 20min', status: 'Concluída' },
    { id: 5, title: 'Sessão Ordinária #40', date: '2026-02-15', duration: '2h 50min', status: 'Concluída' },
  ];

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // TODO: integrate with Supabase Auth
    await new Promise(r => setTimeout(r, 800));

    if (email && password) {
      setIsLoggedIn(true);
    } else {
      setErrorMsg('Preencha todos os campos.');
    }
    setLoading(false);
  }

  // ─── LOGIN SCREEN ───
  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0b1121', fontFamily: 'var(--font-inter), system-ui, sans-serif',
        padding: '2rem',
      }}>
        <div style={{
          width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.04)',
          borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)',
          padding: '2.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #2d82cc 0%, #4db8ff 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem', boxShadow: '0 8px 24px rgba(77,184,255,0.25)',
            }}>
              <FileText size={28} color="#fff" />
            </div>
            <h1 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              Portal de Relatórios
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Acesse com suas credenciais de gestor
            </p>
          </div>

          {errorMsg && (
            <div style={{
              padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem',
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Email</span>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="gestor@camara.gov.br"
                  style={{
                    width: '100%', padding: '0.7rem 0.7rem 0.7rem 2.3rem', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                    color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Senha</span>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  style={{
                    width: '100%', padding: '0.7rem 0.7rem 0.7rem 2.3rem', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                    color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </label>

            <button
              type="submit" disabled={loading}
              style={{
                marginTop: '0.5rem', padding: '0.8rem', borderRadius: '10px',
                background: 'linear-gradient(135deg, #2d82cc, #4db8ff)', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(77,184,255,0.3)',
                transition: 'transform 0.2s',
              }}
            >
              {loading ? 'Entrando...' : <><LogIn size={18} /> Entrar</>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowLeft size={14} /> Voltar ao Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── REPORTS DASHBOARD ───
  return (
    <div style={{
      minHeight: '100vh', background: '#0b1121', color: '#fff',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(11,17,33,0.9)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2d82cc 0%, #4db8ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={20} color="#fff" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Relatórios</span>
            <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>Portal do Gestor</span>
          </div>
        </div>
        <button
          onClick={() => setIsLoggedIn(false)}
          style={{
            padding: '0.5rem 1rem', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
            color: '#94a3b8', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </header>

      {/* Stats Cards */}
      <section style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem', padding: '2rem', maxWidth: '1100px', margin: '0 auto',
      }}>
        {[
          { label: 'Total de Sessões', value: '42', icon: <FileText size={20} color="#4db8ff" />, color: 'rgba(45,130,204,0.15)' },
          { label: 'Último Mês', value: '8', icon: <Calendar size={20} color="#22c55e" />, color: 'rgba(34,197,94,0.15)' },
          { label: 'Horas Totais', value: '96h', icon: <Clock size={20} color="#a855f7" />, color: 'rgba(168,85,247,0.15)' },
          { label: 'Backups Salvos', value: '38', icon: <Download size={20} color="#f59e0b" />, color: 'rgba(245,158,11,0.15)' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px', background: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem',
            }}>
              {stat.icon}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.2rem' }}>{stat.value}</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Sessions Table */}
      <section style={{ padding: '0 2rem 3rem', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Histórico de Sessões</h2>
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Sessão', 'Data', 'Duração', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '0.9rem 1.25rem', color: '#64748b',
                    fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, fontSize: '0.9rem' }}>{s.title}</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontSize: '0.9rem' }}>{s.date}</td>
                  <td style={{ padding: '0.9rem 1.25rem', color: '#94a3b8', fontSize: '0.9rem' }}>{s.duration}</td>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <span style={{
                      padding: '0.3rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700,
                      background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)',
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <button style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent', color: '#4db8ff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    }}>
                      <Download size={14} /> Baixar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
