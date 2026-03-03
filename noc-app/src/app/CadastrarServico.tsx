'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_NOC_API_URL ?? 'http://localhost:4000';
const CRITICIDADES = ['baixa', 'media', 'alta', 'critica'] as const;

export function CadastrarServico() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [criticidade, setCriticidade] = useState<(typeof CRITICIDADES)[number]>('media');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), criticidade }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Erro ${res.status}`);
      }
      setNome('');
      setCriticidade('media');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 20,
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        marginBottom: 24,
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '1.1rem', color: '#0f172a' }}>
        Cadastrar serviço
      </h2>
      {error && <p style={{ color: '#b91c1c', marginBottom: 12, fontSize: 14 }}>{error}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 14, color: '#475569' }}>Nome</span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="ex: Vigilância, Internet"
            required
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              minWidth: 200,
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 14, color: '#475569' }}>Criticidade</span>
          <select
            value={criticidade}
            onChange={(e) => setCriticidade(e.target.value as (typeof CRITICIDADES)[number])}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
            }}
          >
            {CRITICIDADES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 20px',
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Salvando…' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
}
