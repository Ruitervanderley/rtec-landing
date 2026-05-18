'use server';

import { revalidatePath } from 'next/cache';
import { Env } from '@/lib/Env';

type ActionError = {
  error: string;
};

const serviceCriticalities = ['baixa', 'media', 'alta', 'critica'] as const;

export async function createServiceAction(formData: FormData): Promise<ActionError | { success: true }> {
  const nome = String(formData.get('nome') ?? '').trim();
  const criticidade = String(formData.get('criticidade') ?? '').trim();

  if (!nome) {
    return { error: 'Nome do serviço é obrigatório.' };
  }

  if (!serviceCriticalities.includes(criticidade as (typeof serviceCriticalities)[number])) {
    return { error: 'Criticidade inválida.' };
  }

  try {
    const response = await fetch(`${Env.opsApiBaseUrl}/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        criticidade,
        nome,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { error: data.error || `Falha na API: ${response.status}` };
    }

    revalidatePath('/servicos');
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Erro de conexão com API NOC',
    };
  }
}
