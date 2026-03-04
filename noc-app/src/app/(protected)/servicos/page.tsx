import { Plus, Server, Settings } from 'lucide-react';
import Link from 'next/link';
import { CadastrarServico } from '../../CadastrarServico';

const API_URL = process.env.NEXT_PUBLIC_NOC_API_URL ?? 'http://localhost:4000';

async function getServices() {
  const token = process.env.OPS_ADMIN_SERVICE_TOKEN ?? '';
  const res = await fetch(`${API_URL}/v1/services`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Falha ao carregar serviços');
  }
  const data = (await res.json()) as { services: Array<{ id: string; nome: string; criticidade: string }> };
  return data.services;
}

function CriticidadeBadge({ criticidade }: { criticidade: string }) {
  const cores: Record<string, string> = {
    baixa: 'badge-success',
    media: 'badge-warning',
    alta: 'badge-warning',
    critica: 'badge-error',
  };
  const badgeClass = cores[criticidade] ?? 'badge-neutral';
  return (
    <span className={`badge ${badgeClass}`}>
      {criticidade.toUpperCase()}
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
    <section>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: 800, 
            background: 'var(--brand-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}>
            <Server size={26} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            Catálogo de Serviços NOC
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gerenciamento de incidentes e mapeamento de dependências operacionais.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
        <Plus size={20} color="var(--text-muted)" />
        <div style={{ flex: 1 }}>
          <CadastrarServico />
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', marginBottom: '2rem' }}>
          <strong>{error}</strong>
          . Verifique se a NOC API está rodando em
          {API_URL}
          .
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {services.map(s => (
          <li key={s.id}>
            <Link
              href={`/servicos/${s.id}`}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: '#f1f5f9', borderRadius: '8px' }}>
                  <Settings size={20} color="var(--accent-primary)" />
                </div>
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{s.nome}</span>
              </div>
              <CriticidadeBadge criticidade={s.criticidade} />
            </Link>
          </li>
        ))}
      </ul>

      {!error && services.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Nenhum serviço cadastrado no catálogo. Utilize o formulário acima para adicionar (POST /services).
        </div>
      )}
    </section>
  );
}
