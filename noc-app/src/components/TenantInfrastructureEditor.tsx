'use client';

import type { TenantInfrastructureProfile } from '@/lib/ops-api';
import { AlertCircle, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { updateTenantInfrastructureAction } from '@/app/actions/tenant';

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function toLines(value: string[]) {
  return value.join('\n');
}

function docsToLines(profile: TenantInfrastructureProfile) {
  return profile.docs.map(doc => `${doc.label}|${doc.url}`).join('\n');
}

function linesToDocs(value: string) {
  return splitLines(value)
    .map((line) => {
      const [label, url] = line.split('|').map(part => part?.trim() ?? '');
      if (!label || !url) {
        return null;
      }

      return { label, url };
    })
    .filter((entry): entry is { label: string; url: string } => Boolean(entry));
}

export function TenantInfrastructureEditor(props: {
  infrastructure: TenantInfrastructureProfile;
  infrastructureIsDefault: boolean;
  tenantId: string;
  tenantName: string;
  tenantType: string;
}) {
  const [profile, setProfile] = useState(props.infrastructure);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  function updateAsset(index: number, field: keyof TenantInfrastructureProfile['assets'][number], value: string) {
    setProfile((current) => {
      const nextAssets = [...current.assets];
      const currentAsset = nextAssets[index];
      if (!currentAsset) {
        return current;
      }

      nextAssets[index] = {
        ...currentAsset,
        [field]: value,
      };

      return {
        ...current,
        assets: nextAssets,
      };
    });
  }

  function updateAssetStatus(index: number, value: 'active' | 'maintenance' | 'planned') {
    setProfile((current) => {
      const nextAssets = [...current.assets];
      const currentAsset = nextAssets[index];
      if (!currentAsset) {
        return current;
      }

      nextAssets[index] = {
        ...currentAsset,
        status: value,
      };

      return {
        ...current,
        assets: nextAssets,
      };
    });
  }

  function removeAsset(index: number) {
    setProfile(current => ({
      ...current,
      assets: current.assets.filter((_, assetIndex) => assetIndex !== index),
    }));
  }

  function addAsset() {
    setProfile(current => ({
      ...current,
      assets: [
        ...current.assets,
        {
          category: 'asset',
          host: null,
          id: crypto.randomUUID(),
          ipAddress: null,
          notes: null,
          platform: null,
          port: null,
          role: '',
          status: 'active',
          title: '',
        },
      ],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.set('id', props.tenantId);
    formData.set('profile', JSON.stringify(profile));

    const response = await updateTenantInfrastructureAction(formData);
    setSaving(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setSuccessMsg('Inventario tecnico salvo com sucesso.');
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '1.25rem' }}>
      <div
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.35rem' }}>
            Inventario tecnico e documentacao
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Perfil operacional do tenant
            {' '}
            {props.tenantName}
            {' '}
            (
            {props.tenantType}
            ).
          </p>
        </div>
        <button
          disabled={saving}
          onClick={handleSave}
          style={{
            alignItems: 'center',
            backgroundColor: 'var(--accent-primary)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: saving ? 'wait' : 'pointer',
            display: 'flex',
            fontWeight: 700,
            gap: '0.5rem',
            opacity: saving ? 0.7 : 1,
            padding: '0.7rem 1rem',
          }}
          type="button"
        >
          <Save size={18} />
          {saving ? 'Salvando...' : 'Salvar inventario'}
        </button>
      </div>

      {props.infrastructureIsDefault
        ? (
            <div
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.18)',
                borderRadius: '10px',
                color: '#1d4ed8',
                padding: '0.9rem 1rem',
              }}
            >
              Este tenant esta usando um modelo inicial. Salve para persistir a configuracao no painel.
            </div>
          )
        : null}

      {errorMsg
        ? (
            <div
              style={{
                alignItems: 'center',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#991b1b',
                display: 'flex',
                gap: '0.5rem',
                padding: '0.9rem 1rem',
              }}
            >
              <AlertCircle size={18} />
              {errorMsg}
            </div>
          )
        : null}

      {successMsg
        ? (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.18)',
                borderRadius: '10px',
                color: '#166534',
                padding: '0.9rem 1rem',
              }}
            >
              {successMsg}
            </div>
          )
        : null}

      <label style={{ display: 'grid', gap: '0.4rem' }}>
        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>Visao geral</span>
        <textarea
          onChange={event => setProfile(current => ({ ...current, overview: event.target.value }))}
          rows={3}
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.75rem', resize: 'vertical' }}
          value={profile.overview}
        />
      </label>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Origem WAN</span>
          <input onChange={event => setProfile(current => ({ ...current, network: { ...current.network, wanSource: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.network.wanSource} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Gateway</span>
          <input onChange={event => setProfile(current => ({ ...current, network: { ...current.network, gatewayName: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.network.gatewayName} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>IP do gateway</span>
          <input onChange={event => setProfile(current => ({ ...current, network: { ...current.network, gatewayIp: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.network.gatewayIp} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Firewall</span>
          <input onChange={event => setProfile(current => ({ ...current, network: { ...current.network, firewallName: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.network.firewallName} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>LAN do firewall</span>
          <input onChange={event => setProfile(current => ({ ...current, network: { ...current.network, firewallLanIp: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.network.firewallLanIp} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Sub-rede LAN</span>
          <input onChange={event => setProfile(current => ({ ...current, network: { ...current.network, lanSubnet: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.network.lanSubnet} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Switch principal</span>
          <input onChange={event => setProfile(current => ({ ...current, network: { ...current.network, switchName: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.network.switchName} />
        </label>
      </div>

      <label style={{ display: 'grid', gap: '0.4rem' }}>
        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>Topologia da rede</span>
        <textarea
          onChange={event => setProfile(current => ({ ...current, network: { ...current.network, topology: splitLines(event.target.value) } }))}
          rows={5}
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.75rem', resize: 'vertical' }}
          value={toLines(profile.network.topology)}
        />
      </label>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>VPN / provider</span>
          <input onChange={event => setProfile(current => ({ ...current, vpn: { ...current.vpn, provider: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.vpn.provider} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>IP principal da VPN</span>
          <input onChange={event => setProfile(current => ({ ...current, vpn: { ...current.vpn, tailnetIp: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.vpn.tailnetIp} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Dominio VPN</span>
          <input onChange={event => setProfile(current => ({ ...current, vpn: { ...current.vpn, domain: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.vpn.domain} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Headscale</span>
          <input onChange={event => setProfile(current => ({ ...current, vpn: { ...current.vpn, headscaleDomain: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.vpn.headscaleDomain} />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>DERP</span>
          <input onChange={event => setProfile(current => ({ ...current, vpn: { ...current.vpn, derpDomain: event.target.value } }))} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.65rem' }} type="text" value={profile.vpn.derpDomain} />
        </label>
      </div>

      <label style={{ alignItems: 'center', color: 'var(--text-primary)', display: 'flex', gap: '0.5rem' }}>
        <input checked={profile.vpn.subnetRouting} onChange={event => setProfile(current => ({ ...current, vpn: { ...current.vpn, subnetRouting: event.target.checked } }))} type="checkbox" />
        Subnet routing ativo
      </label>

      <label style={{ display: 'grid', gap: '0.4rem' }}>
        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>Nodes da VPN</span>
        <textarea
          onChange={event => setProfile(current => ({ ...current, vpn: { ...current.vpn, nodes: splitLines(event.target.value) } }))}
          rows={5}
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.75rem', resize: 'vertical' }}
          value={toLines(profile.vpn.nodes)}
        />
      </label>

      <label style={{ display: 'grid', gap: '0.4rem' }}>
        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>Resumo de monitoramento</span>
        <textarea
          onChange={event => setProfile(current => ({ ...current, monitoring: { ...current.monitoring, summary: event.target.value } }))}
          rows={3}
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.75rem', resize: 'vertical' }}
          value={profile.monitoring.summary}
        />
      </label>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Stack atual</span>
          <textarea
            onChange={event => setProfile(current => ({ ...current, monitoring: { ...current.monitoring, stack: splitLines(event.target.value) } }))}
            rows={5}
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.75rem', resize: 'vertical' }}
            value={toLines(profile.monitoring.stack)}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Melhorias planejadas</span>
          <textarea
            onChange={event => setProfile(current => ({ ...current, monitoring: { ...current.monitoring, improvements: splitLines(event.target.value) } }))}
            rows={5}
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.75rem', resize: 'vertical' }}
            value={toLines(profile.monitoring.improvements)}
          />
        </label>
      </div>

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, margin: 0 }}>Ativos e servicos</h3>
        <button
          onClick={addAsset}
          style={{ alignItems: 'center', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', gap: '0.4rem', padding: '0.55rem 0.8rem' }}
          type="button"
        >
          <Plus size={16} />
          Adicionar ativo
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {profile.assets.map((asset, index) => (
          <div key={asset.id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'grid', gap: '0.9rem', padding: '1rem' }}>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ color: 'var(--text-primary)' }}>
                Ativo
                {index + 1}
              </strong>
              <button onClick={() => removeAsset(index)} style={{ backgroundColor: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer' }} type="button">
                <Trash2 size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <input onChange={event => updateAsset(index, 'title', event.target.value)} placeholder="Nome do ativo" style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem' }} type="text" value={asset.title} />
              <input onChange={event => updateAsset(index, 'category', event.target.value)} placeholder="Categoria" style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem' }} type="text" value={asset.category} />
              <input onChange={event => updateAsset(index, 'role', event.target.value)} placeholder="Funcao / papel" style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem' }} type="text" value={asset.role} />
              <input onChange={event => updateAsset(index, 'platform', event.target.value)} placeholder="Plataforma" style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem' }} type="text" value={asset.platform ?? ''} />
              <input onChange={event => updateAsset(index, 'host', event.target.value)} placeholder="Host" style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem' }} type="text" value={asset.host ?? ''} />
              <input onChange={event => updateAsset(index, 'ipAddress', event.target.value)} placeholder="IP" style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem' }} type="text" value={asset.ipAddress ?? ''} />
              <input onChange={event => updateAsset(index, 'port', event.target.value)} placeholder="Porta" style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem' }} type="text" value={asset.port ?? ''} />
              <select onChange={event => updateAssetStatus(index, event.target.value as 'active' | 'maintenance' | 'planned')} style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem' }} value={asset.status}>
                <option value="active">Ativo</option>
                <option value="maintenance">Manutencao</option>
                <option value="planned">Planejado</option>
              </select>
            </div>
            <textarea onChange={event => updateAsset(index, 'notes', event.target.value)} placeholder="Observacoes tecnicas" rows={3} style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', resize: 'vertical' }} value={asset.notes ?? ''} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Responsabilidades</span>
          <textarea
            onChange={event => setProfile(current => ({ ...current, responsibilities: splitLines(event.target.value) }))}
            rows={6}
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.75rem', resize: 'vertical' }}
            value={toLines(profile.responsibilities)}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Links tecnicos (rotulo|url)</span>
          <textarea
            onChange={event => setProfile(current => ({ ...current, docs: linesToDocs(event.target.value) }))}
            rows={6}
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.75rem', resize: 'vertical' }}
            value={docsToLines(profile)}
          />
        </label>
      </div>

      <label style={{ display: 'grid', gap: '0.4rem' }}>
        <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>Notas operacionais</span>
        <textarea
          onChange={event => setProfile(current => ({ ...current, notes: event.target.value }))}
          rows={4}
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '0.75rem', resize: 'vertical' }}
          value={profile.notes}
        />
      </label>
    </section>
  );
}
