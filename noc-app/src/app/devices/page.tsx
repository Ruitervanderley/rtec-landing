import { revalidatePath } from 'next/cache';
import { getDevices, revokeDevice } from '@/lib/ops-api';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DevicesPage() {
  async function revokeDeviceAction(formData: FormData) {
    'use server';

    const devicePk = String(formData.get('devicePk') ?? '').trim();
    if (!devicePk) {
      return;
    }

    await revokeDevice(devicePk);
    revalidatePath('/devices');
  }

  let devices = [] as Awaited<ReturnType<typeof getDevices>>;
  let error: string | null = null;

  try {
    devices = await getDevices(500);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Erro ao carregar dispositivos';
  }

  return (
    <section>
      <h1 style={{ marginTop: 0, marginBottom: 6 }}>Dispositivos</h1>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Heartbeat do LegislativoTimer por notebook e tenant.
      </p>

      {error ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', padding: 12, borderRadius: 10 }}>
          {error}
        </div>
      ) : null}

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #dbe2ea', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1160 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {['Tenant', 'Device ID', 'Nome', 'Versao', 'Online', 'Status', 'Ultimo heartbeat', 'Atualizado', 'Acoes'].map((header) => (
                <th key={header} style={{ textAlign: 'left', fontSize: 12, color: '#334155', padding: '0.65rem 0.75rem', borderBottom: '1px solid #dbe2ea' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id} style={{ background: device.is_online ? '#f8fafc' : '#fff7ed' }}>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{device.tenant_name}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontFamily: 'Consolas, monospace', fontSize: 12 }}>{device.device_id}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{device.device_name || '--'}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{device.app_version || '--'}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: device.is_online ? '#166534' : '#9a3412' }}>
                  {device.is_online ? 'ONLINE' : 'OFFLINE'}
                </td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{device.last_status || '--'}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{formatDateTime(device.last_seen_at)}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>{formatDateTime(device.updated_at)}</td>
                <td style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                  <form action={revokeDeviceAction}>
                    <input type="hidden" name="devicePk" value={device.id} />
                    <button
                      type="submit"
                      style={{
                        border: '1px solid #fecaca',
                        background: '#fff1f2',
                        color: '#9f1239',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '0.3rem 0.6rem',
                        cursor: 'pointer',
                      }}
                    >
                      Revogar token
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
