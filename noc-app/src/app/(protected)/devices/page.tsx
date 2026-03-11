import { Laptop } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { DeviceTable } from '@/components/DeviceTable';
import { getDevices, revokeDevice } from '@/lib/ops-api';

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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Laptop size={26} color="var(--accent-primary)" />
          Todos os Dispositivos Ativos
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Status individual de comunicação de todos os clientes. Utilize o menu
          {' '}
          <Link href="/tenants" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Tenants</Link>
          {' '}
          para ver os PCs de cada empresa.
        </p>
      </div>

      <DeviceTable
        devices={devices}
        error={error}
        revokeDeviceAction={revokeDeviceAction}
      />
    </section>
  );
}
