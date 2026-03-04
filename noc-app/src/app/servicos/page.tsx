import Link from 'next/link';
import { CadastrarServico } from '../CadastrarServico';

const API_URL = process.env.NEXT_PUBLIC_NOC_API_URL ?? 'http://localhost:4000';

async function getServices() {
  const token = process.env.OPS_ADMIN_SERVICE_TOKEN ?? '';
  const res = await fetch(`${API_URL}/v1/services`, {
    cache: 'no-store',
    headers: { 
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
  });
  if (!res.ok) throw new Error('Falha ao carregar serviÃ§os');
  const data = (await res.json()) as { services: Array<{ id: string; nome: string; criticidade: string }> };
  return data.services;
}

function CriticidadeBadge(props: { criticidade: string }) {
  const cores: Record<string, string> = {
    baixa: '#22c55e',
    media: '#eab308',
    alta: '#f97316',
    critica: '#ef4444',
  };
  const cor = cores[props.criticidade] ?? '#64748b';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.5rem',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        background: `${cor}22`,
        color: cor,
      }}
    >
      {props.criticidade}
    </span>
  );
}

export default async function ServicosPage() {
  let services: Array<{ id: string; nome: string; criticidade: string }> = [];
  let error: string | null = null;
  try {
    services = await getServices();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro ao carregar';
  }

  return (
    <>
      <h1 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#0f172a' }}>
        ServiÃ§os
      </h1>
      <CadastrarServico />
      {error && (
        <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>
          {error}. Verifique se a NOC API estÃ¡ rodando em {API_URL}.
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {services.map((s) => (
          <li key={s.id}>
            <Link
              href={`/servicos/${s.id}`}
              style={{
                display: 'block',
                padding: '1rem 1.25rem',
                background: '#fff',
                borderRadius: 10,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                color: '#0f172a',
                textDecoration: 'none',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontWeight: 600, marginRight: 8 }}>{s.nome}</span>
              <CriticidadeBadge criticidade={s.criticidade} />
            </Link>
          </li>
        ))}
      </ul>
      {!error && services.length === 0 && (
        <p style={{ color: '#64748b' }}>Nenhum serviÃ§o cadastrado. Use a API para criar (POST /services).</p>
      )}
    </>
  );
}
