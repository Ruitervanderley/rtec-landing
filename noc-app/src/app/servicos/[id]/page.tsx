import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_NOC_API_URL ?? 'http://localhost:4000';

async function getServiceDetail(id: string) {
  const token = process.env.OPS_ADMIN_SERVICE_TOKEN ?? '';
  const res = await fetch(`${API_URL}/v1/services/${id}`, {
    cache: 'no-store',
    headers: { 
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Falha ao carregar serviÃ§o');
  }
  return res.json() as Promise<{
    service: { id: string; nome: string; criticidade: string };
    devices: Array<{ id: string; nome: string; tipo: string; local: string; ip: string }>;
    openIncidents: Array<{
      id: string;
      titulo: string;
      severidade: string;
      status: string;
      startedAt: string;
      impactoOperacional: string | null;
      confiancaDiagnostico: number | null;
    }>;
  }>;
}

export default async function ServicoDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  let data: Awaited<ReturnType<typeof getServiceDetail>> = null;
  let error: string | null = null;
  try {
    data = await getServiceDetail(id);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro';
  }

  if (error) {
    return (
      <>
        <p style={{ color: '#b91c1c' }}>{error}</p>
        <Link href="/servicos" style={{ color: '#2563eb' }}>â† Voltar aos serviÃ§os</Link>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <p>ServiÃ§o nÃ£o encontrado.</p>
        <Link href="/servicos" style={{ color: '#2563eb' }}>â† Voltar aos serviÃ§os</Link>
      </>
    );
  }

  const { service, devices, openIncidents } = data;

  return (
    <>
      <p style={{ marginBottom: '1rem' }}>
        <Link href="/servicos" style={{ color: '#2563eb', textDecoration: 'none' }}>â† ServiÃ§os</Link>
      </p>
      <h1 style={{ marginTop: 0, marginBottom: 4, color: '#0f172a' }}>{service.nome}</h1>
      <p style={{ marginTop: 0, color: '#64748b', textTransform: 'capitalize' }}>
        Criticidade: {service.criticidade}
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: 12 }}>Dispositivos</h2>
        {devices.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhum dispositivo vinculado a este serviÃ§o.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devices.map((d) => (
              <li
                key={d.id}
                style={{
                  padding: 12,
                  background: '#fff',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 14,
                }}
              >
                <strong>{d.nome}</strong> Â· {d.tipo} Â· {d.local} Â· {d.ip}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: 12 }}>Incidentes abertos</h2>
        {openIncidents.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhum incidente aberto para este serviÃ§o.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {openIncidents.map((i) => (
              <li
                key={i.id}
                style={{
                  padding: 16,
                  background: i.severidade === 'critical' ? '#fef2f2' : '#fffbeb',
                  borderRadius: 8,
                  border: `1px solid ${i.severidade === 'critical' ? '#fecaca' : '#fde68a'}`,
                }}
              >
                <strong>{i.titulo}</strong>
                {i.impactoOperacional && (
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: '#475569' }}>
                    {i.impactoOperacional}
                  </p>
                )}
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  {new Date(i.startedAt).toLocaleString('pt-BR')}
                  {i.confiancaDiagnostico != null && ` Â· ConfianÃ§a ${Math.round(i.confiancaDiagnostico * 100)}%`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
