import { Laptop } from 'lucide-react';
import { revalidatePath } from 'next/cache';
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
    <section className="page-stack">
      <div className="page-hero">
        <div className="page-hero__content">
          <span className="page-hero__eyebrow">Frota operacional</span>
          <h1 className="page-hero__title">
            <Laptop size={28} color="var(--accent-primary)" />
            Dispositivos agrupados por empresa
          </h1>
          <p className="page-hero__description">
            Esta visao deixa de misturar toda a frota em uma unica tabela. Cada empresa aparece em um bloco proprio, com contagem de online, alertas de atencao e atalho direto para o tenant.
          </p>
        </div>
      </div>

      <DeviceTable
        devices={devices}
        error={error}
        revokeDeviceAction={revokeDeviceAction}
      />
    </section>
  );
}
