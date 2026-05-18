'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createServiceAction } from '@/app/actions/services';

const criticalities = [
  { label: 'Baixa', value: 'baixa' },
  { label: 'Média', value: 'media' },
  { label: 'Alta', value: 'alta' },
  { label: 'Crítica', value: 'critica' },
] as const;

export function CadastrarServico() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [criticidade, setCriticidade] = useState<(typeof criticalities)[number]['value']>('media');
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setFeedback(null);
        startTransition(async () => {
          const result = await createServiceAction(formData);

          if ('error' in result) {
            setFeedback({ text: result.error, tone: 'error' });
            return;
          }

          setNome('');
          setCriticidade('media');
          setFeedback({ text: 'Serviço cadastrado.', tone: 'success' });
          router.refresh();
        });
      }}
      className="service-create-form"
    >
      <div className="service-create-form__header">
        <div>
          <div className="page-hero__eyebrow">Novo escopo operacional</div>
          <h2 className="ops-section-card__title">Cadastrar serviço</h2>
        </div>
        <Plus size={18} />
      </div>

      {feedback
        ? (
            <div
              className={feedback.tone === 'error'
                ? 'service-form-feedback service-form-feedback--error'
                : 'service-form-feedback service-form-feedback--success'}
            >
              {feedback.text}
            </div>
          )
        : null}

      <div className="service-create-form__grid">
        <label className="ops-field">
          <span>Nome</span>
          <input
            name="nome"
            onChange={event => setNome(event.target.value)}
            placeholder="ex: Internet, ERP, Câmeras"
            required
            type="text"
            value={nome}
          />
        </label>

        <label className="ops-field">
          <span>Criticidade</span>
          <select
            name="criticidade"
            onChange={event => setCriticidade(event.target.value as (typeof criticalities)[number]['value'])}
            value={criticidade}
          >
            {criticalities.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button className="agent-primary-button" disabled={isPending} type="submit">
          {isPending ? 'Salvando...' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
}
