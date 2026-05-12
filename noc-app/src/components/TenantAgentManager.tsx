'use client';

import type { DeviceRow, TenantAgentDetail, TenantAgentProvisionResult } from '@/lib/ops-api';
import { AlertCircle, Download, KeyRound, Laptop, RefreshCcw, ShieldAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  provisionTenantAgentAction,
  revokeTenantAgentAction,
  rotateTenantAgentTokenAction,
} from '@/app/actions/tenant';
import { formatDateTime } from '@/lib/format';

function getTokenStatus(device: DeviceRow) {
  if (!device.active_token_expires_at) {
    return {
      badgeClass: 'badge-neutral',
      label: 'Sem token',
    };
  }

  const expiresAt = new Date(device.active_token_expires_at);
  if (Number.isNaN(expiresAt.getTime())) {
    return {
      badgeClass: 'badge-neutral',
      label: 'Token invalido',
    };
  }

  if (expiresAt.getTime() <= Date.now()) {
    return {
      badgeClass: 'badge-error',
      label: 'Token expirado',
    };
  }

  return {
    badgeClass: 'badge-success',
    label: 'Token ativo',
  };
}

function TokenResultPanel(props: {
  result: TenantAgentProvisionResult;
}) {
  const configJson = JSON.stringify({
    AgentSettings: {
      ApiBaseUrl: 'https://api.rtectecnologia.com.br',
      DeviceToken: props.result.deviceToken,
      DeviceNameOverride: props.result.deviceName,
      EnableBgInfo: true,
      HeartbeatTimeoutSeconds: 20,
      IntervalSeconds: 60,
      ServiceName: 'RtecNocAgent',
    },
  }, null, 2);

  return (
    <div className="agent-token-panel">
      <div className="agent-token-panel__header">
        <div>
          <div className="page-hero__eyebrow">Token de instalação gerado</div>
          <strong className="agent-token-panel__title">{props.result.deviceName}</strong>
        </div>
        <span className="badge badge-success">
          Expira
          {' '}
          {formatDateTime(props.result.expiresAtUtc)}
        </span>
      </div>

      <div className="agent-token-panel__grid">
        <div>
          <div className="agent-token-panel__label">Device ID</div>
          <div className="agent-token-panel__mono">{props.result.deviceId}</div>
        </div>
        <div>
          <div className="agent-token-panel__label">Responsavel</div>
          <div className="agent-token-panel__value">
            {props.result.owner?.displayName || props.result.owner?.email || 'Emissão administrativa'}
          </div>
        </div>
      </div>

      <div>
        <div className="agent-token-panel__label">Device token</div>
        <div className="agent-token-panel__mono">{props.result.deviceToken}</div>
      </div>

      <div>
        <div className="agent-token-panel__label">appsettings.json</div>
        <pre className="agent-token-panel__code">{configJson}</pre>
      </div>

      <div className="ops-note-card ops-note-card--blue">
        <strong>Fluxo de instalacao</strong>
        <span>Use o pacote RtecNocAgent-1.1.0-win-x64.zip, substitua o appsettings.json por este conteudo e execute install-agent.ps1 como administrador na maquina do cliente.</span>
      </div>
    </div>
  );
}

export function TenantAgentManager(props: {
  agent: TenantAgentDetail;
  devices: DeviceRow[];
  tenantId: string;
  tenantName: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<TenantAgentProvisionResult | null>(null);
  const coverageRatio = props.agent.summary.provisionedDevices > 0
    ? Math.round((props.agent.summary.onlineDevices / props.agent.summary.provisionedDevices) * 100)
    : 0;

  async function handleProvision(formData: FormData) {
    setWorking(true);
    setErrorMsg('');
    setSuccessMsg('');

    const response = await provisionTenantAgentAction(formData);
    setWorking(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setResult(response);
    setCreateOpen(false);
    setSuccessMsg('Token de instalacao gerado. Aplique o appsettings.json na maquina do cliente.');
    router.refresh();
  }

  async function handleRotate(devicePk: string) {
    setWorking(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.set('tenant_id', props.tenantId);
    formData.set('device_pk', devicePk);

    const response = await rotateTenantAgentTokenAction(formData);
    setWorking(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setResult(response);
    setSuccessMsg('Token rotacionado. Substitua o valor no appsettings da maquina.');
    router.refresh();
  }

  async function handleRevoke(devicePk: string) {
    setWorking(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.set('tenant_id', props.tenantId);
    formData.set('device_pk', devicePk);

    const response = await revokeTenantAgentAction(formData);
    setWorking(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setResult(null);
    setSuccessMsg('Agente revogado com sucesso.');
    router.refresh();
  }

  return (
    <section className="card agent-panel">
      <div className="agent-panel__header">
        <div>
          <div className="page-hero__eyebrow">Agente da empresa</div>
          <h2 className="agent-panel__title">Instalacao e controle do RTEC NOC Agent</h2>
          <p className="agent-panel__description">
            Gere o token de instalacao pelo proprio painel, aplique no `appsettings.json` do agente e acompanhe quais dispositivos deste tenant continuam autorizados.
          </p>
        </div>

        <div className="page-hero__actions">
          <button
            className="agent-primary-button"
            disabled={working}
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            <Laptop size={16} />
            Gerar token de instalacao
          </button>
        </div>
      </div>

      <div className="summary-strip">
        <div className="summary-card">
          <span className="summary-card__label">Maquinas provisionadas</span>
          <strong className="summary-card__value">{props.agent.summary.provisionedDevices}</strong>
          <div className="summary-card__meta">Dispositivos com agente registrado neste tenant.</div>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Tokens ativos</span>
          <strong className="summary-card__value">{props.agent.summary.activeTokens}</strong>
          <div className="summary-card__meta">Tokens validos e nao revogados para a frota.</div>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Online agora</span>
          <strong className="summary-card__value">{props.agent.summary.onlineDevices}</strong>
          <div className="summary-card__meta">Com heartbeat recente nos ultimos 15 minutos.</div>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Ultima emissao</span>
          <strong className="summary-card__value">{formatDateTime(props.agent.summary.latestTokenIssuedAt)}</strong>
          <div className="summary-card__meta">Ultimo token emitido para esta empresa.</div>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">Cobertura da frota</span>
          <strong className="summary-card__value">
            {props.agent.summary.provisionedDevices > 0 ? `${coverageRatio}%` : '--'}
          </strong>
          <div className="summary-card__meta">Percentual de maquinas provisionadas que seguem online agora.</div>
        </div>
      </div>

      {props.agent.owner
        ? (
            <div className="agent-owner-banner">
              <strong>Usuario base do provisionamento:</strong>
              {' '}
              {props.agent.owner.displayName || props.agent.owner.email}
              {' · '}
              {props.agent.owner.email}
            </div>
          )
        : (
            <div className="alert-panel alert-panel--warning">
              <AlertCircle size={18} />
              Este tenant ainda nao possui usuarios vinculados. O painel pode emitir o token mesmo assim, mas o dispositivo ficara sem responsavel ate um usuario ser associado.
            </div>
          )}

      {errorMsg
        ? (
            <div className="alert-panel alert-panel--error">
              <AlertCircle size={18} />
              {errorMsg}
            </div>
          )
        : null}

      {successMsg
        ? <div className="agent-owner-banner agent-owner-banner--success">{successMsg}</div>
        : null}

      {result
        ? <TokenResultPanel result={result} />
        : null}

      <div className="ops-layout-grid">
        <section className="ops-note-card">
          <strong>Como implantar o agente nesta empresa</strong>
          <ol className="ops-number-list">
            <li>Gere o token desta empresa pelo painel.</li>
            <li>Copie o pacote do agente para a pasta local da maquina.</li>
            <li>Substitua o `DeviceToken` no `appsettings.json` e ajuste o nome da maquina, se necessário.</li>
            <li>Execute `install-agent.ps1` como administrador.</li>
          </ol>
        </section>

        <section className="ops-note-card ops-note-card--green">
          <strong>Pacote minimo do cliente</strong>
          <div className="tenant-alert-block__signals">
            <span className="tenant-alert-block__signal">
              <Download size={14} />
              noc-agent.exe
            </span>
            <span className="tenant-alert-block__signal">appsettings.json</span>
            <span className="tenant-alert-block__signal">install-agent.ps1</span>
            <span className="tenant-alert-block__signal">uninstall-agent.ps1</span>
            <span className="tenant-alert-block__signal">Bginfo.exe opcional</span>
          </div>
        </section>
      </div>

      <div className="agent-device-list">
        {props.devices.map((device) => {
          const tokenStatus = getTokenStatus(device);

          return (
            <article key={device.id} className="agent-device-item">
              <div className="agent-device-item__head">
                <div>
                  <strong className="agent-device-item__title">{device.device_name || device.device_id}</strong>
                  <div className="agent-device-item__mono">{device.device_id}</div>
                </div>

                <div className="agent-device-item__badges">
                  <span className={`badge ${device.is_online ? 'badge-success' : 'badge-error'}`}>
                    {device.is_online ? 'Online' : 'Offline'}
                  </span>
                  <span className={`badge ${tokenStatus.badgeClass}`}>{tokenStatus.label}</span>
                </div>
              </div>

              <div className="agent-device-item__grid">
                <div>
                  <span className="agent-device-item__label">Versao</span>
                  <strong>{device.app_version || '--'}</strong>
                </div>
                <div>
                  <span className="agent-device-item__label">Ultimo heartbeat</span>
                  <strong>{formatDateTime(device.last_seen_at)}</strong>
                </div>
                <div>
                  <span className="agent-device-item__label">Token expira</span>
                  <strong>{formatDateTime(device.active_token_expires_at ?? null)}</strong>
                </div>
                <div>
                  <span className="agent-device-item__label">Responsavel</span>
                  <strong>{device.owner_display_name || device.owner_email || '--'}</strong>
                </div>
              </div>

              <div className="agent-device-item__actions">
                <button
                  className="agent-secondary-button"
                  disabled={working}
                  onClick={() => handleRotate(device.id)}
                  type="button"
                >
                  <RefreshCcw size={14} />
                  Rotacionar token
                </button>
                <button
                  className="agent-secondary-button agent-secondary-button--danger"
                  disabled={working}
                  onClick={() => handleRevoke(device.id)}
                  type="button"
                >
                  <ShieldAlert size={14} />
                  Revogar agente
                </button>
              </div>
            </article>
          );
        })}

        {props.devices.length === 0
          ? (
              <div className="empty-state">
                Nenhuma maquina provisionada para
                {' '}
                {props.tenantName}
                {' '}
                no momento.
              </div>
            )
          : null}
      </div>

      {createOpen
        ? (
            <div className="agent-modal">
              <div className="agent-modal__panel">
                <div className="agent-modal__header">
                  <div>
                    <h3 className="agent-modal__title">Gerar token de instalacao</h3>
                    <p className="agent-modal__subtitle">{props.tenantName}</p>
                  </div>
                  <button
                    disabled={working}
                    onClick={() => setCreateOpen(false)}
                    type="button"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form action={handleProvision} className="agent-modal__form">
                  <input name="tenant_id" type="hidden" value={props.tenantId} />

                  <label className="agent-modal__field">
                    <span>Nome da maquina</span>
                    <input defaultValue={`${props.tenantName} - estacao`} name="device_name" type="text" />
                  </label>

                  <label className="agent-modal__field">
                    <span>Device ID opcional</span>
                    <input name="device_id" placeholder="Deixe vazio para gerar automaticamente" type="text" />
                  </label>

                  <label className="agent-modal__field">
                    <span>Versao inicial do agente</span>
                    <input defaultValue="1.1.0" name="app_version" type="text" />
                  </label>

                  <div className="agent-modal__footer">
                    <button
                      className="agent-secondary-button"
                      disabled={working}
                      onClick={() => setCreateOpen(false)}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button className="agent-primary-button" disabled={working} type="submit">
                      <KeyRound size={15} />
                      {working ? 'Gerando...' : 'Gerar token de instalacao'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        : null}
    </section>
  );
}
