'use client';

import type { DeviceRow, TenantAgentDetail, TenantAgentProvisionResult } from '@/lib/ops-api';
import { AlertCircle, Clipboard, Download, KeyRound, Laptop, RefreshCcw, ShieldAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  provisionTenantAgentAction,
  revokeTenantAgentAction,
  rotateTenantAgentTokenAction,
} from '@/app/actions/tenant';
import { formatDateTime } from '@/lib/format';

type AgentWallpaperConfig = {
  imagePath: string;
  mode: 'rtec' | 'current' | 'custom';
};

type OfficialAgentPackage = {
  fileName: string;
  sha256: string;
  updatedAt: string;
  url: string;
  version: string;
};

type ZipFileEntry = {
  content: string;
  name: string;
};

function sanitizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'rtec-noc';
}

function getDosDateParts(date: Date) {
  const year = Math.max(1980, date.getFullYear());

  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function getCrc32(bytes: Uint8Array) {
  let crc = 0xFFFFFFFF;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pushUint16(target: number[], value: number) {
  target.push(value & 0xFF, (value >>> 8) & 0xFF);
}

function pushUint32(target: number[], value: number) {
  target.push(value & 0xFF, (value >>> 8) & 0xFF, (value >>> 16) & 0xFF, (value >>> 24) & 0xFF);
}

function createZipBlob(files: ZipFileEntry[]) {
  const encoder = new TextEncoder();
  const now = getDosDateParts(new Date());
  const body: number[] = [];
  const centralDirectory: number[] = [];

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = getCrc32(contentBytes);
    const offset = body.length;

    pushUint32(body, 0x04034B50);
    pushUint16(body, 20);
    pushUint16(body, 0x0800);
    pushUint16(body, 0);
    pushUint16(body, now.time);
    pushUint16(body, now.date);
    pushUint32(body, crc);
    pushUint32(body, contentBytes.length);
    pushUint32(body, contentBytes.length);
    pushUint16(body, nameBytes.length);
    pushUint16(body, 0);
    body.push(...nameBytes, ...contentBytes);

    pushUint32(centralDirectory, 0x02014B50);
    pushUint16(centralDirectory, 20);
    pushUint16(centralDirectory, 20);
    pushUint16(centralDirectory, 0x0800);
    pushUint16(centralDirectory, 0);
    pushUint16(centralDirectory, now.time);
    pushUint16(centralDirectory, now.date);
    pushUint32(centralDirectory, crc);
    pushUint32(centralDirectory, contentBytes.length);
    pushUint32(centralDirectory, contentBytes.length);
    pushUint16(centralDirectory, nameBytes.length);
    pushUint16(centralDirectory, 0);
    pushUint16(centralDirectory, 0);
    pushUint16(centralDirectory, 0);
    pushUint16(centralDirectory, 0);
    pushUint32(centralDirectory, 0);
    pushUint32(centralDirectory, offset);
    centralDirectory.push(...nameBytes);
  }

  const centralOffset = body.length;
  body.push(...centralDirectory);
  pushUint32(body, 0x06054B50);
  pushUint16(body, 0);
  pushUint16(body, 0);
  pushUint16(body, files.length);
  pushUint16(body, files.length);
  pushUint32(body, centralDirectory.length);
  pushUint32(body, centralOffset);
  pushUint16(body, 0);

  return new Blob([new Uint8Array(body)], { type: 'application/zip' });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
  tenantName: string;
  wallpaper: AgentWallpaperConfig;
}) {
  const [copyStatus, setCopyStatus] = useState('');
  const preserveExistingWallpaper = props.wallpaper.mode === 'current';
  const wallpaperImagePath = props.wallpaper.mode === 'custom' ? props.wallpaper.imagePath : '';
  const configJson = JSON.stringify({
    AgentSettings: {
      ApiBaseUrl: 'https://api.rtectecnologia.com.br',
      CompanyName: props.tenantName,
      DeviceToken: props.result.deviceToken,
      DeviceNameOverride: props.result.deviceName,
      EnableBgInfo: true,
      PreserveExistingWallpaper: preserveExistingWallpaper,
      WallpaperImagePath: wallpaperImagePath,
      HeartbeatTimeoutSeconds: 20,
      IntervalSeconds: 60,
      ServiceName: 'RtecNocAgent',
    },
  }, null, 2);
  const installCommand = 'Set-ExecutionPolicy -Scope Process Bypass\r\n.\\install-agent.ps1';
  const packageName = `rtec-noc-agent-${sanitizeFilePart(props.tenantName)}-${sanitizeFilePart(props.result.deviceName)}.zip`;

  function getInstallReadme() {
    return [
      `RTEC NOC Agent - ${props.tenantName}`,
      '',
      `Dispositivo: ${props.result.deviceName}`,
      `Device ID: ${props.result.deviceId}`,
      `Token expira em: ${formatDateTime(props.result.expiresAtUtc)}`,
      '',
      'Como instalar:',
      '1. Extraia o pacote RtecNocAgent-1.1.0-win-x64.zip oficial.',
      '2. Substitua o appsettings.json pelo arquivo deste ZIP.',
      '3. Se usar wallpaper customizado, coloque wallpaper.jpg, wallpaper.jpeg ou wallpaper.png ao lado do instalador.',
      '4. Abra o PowerShell como Administrador.',
      '5. Execute install-command.ps1 ou rode o comando abaixo:',
      '',
      installCommand,
      '',
      'Observacao: este pacote contém a configuração da empresa. Ele não inclui o noc-agent.exe.',
    ].join('\r\n');
  }

  function handleDownloadPackage() {
    downloadBlob(createZipBlob([
      {
        content: configJson,
        name: 'appsettings.json',
      },
      {
        content: getInstallReadme(),
        name: 'README-INSTALACAO.txt',
      },
      {
        content: installCommand,
        name: 'install-command.ps1',
      },
    ]), packageName);
  }

  async function handleCopyInstallCommand() {
    await navigator.clipboard.writeText(installCommand);
    setCopyStatus('Comando copiado.');
    window.setTimeout(() => setCopyStatus(''), 2500);
  }

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

      <div className="agent-token-panel__actions">
        <button className="agent-primary-button" onClick={handleDownloadPackage} type="button">
          <Download size={15} />
          Baixar pacote de configuração
        </button>
        <button className="agent-secondary-button" onClick={handleCopyInstallCommand} type="button">
          <Clipboard size={15} />
          Copiar comando de instalação
        </button>
        {copyStatus ? <span className="agent-token-panel__status">{copyStatus}</span> : null}
      </div>

      <div className="ops-note-card ops-note-card--blue">
        <strong>Fluxo de instalacao</strong>
        <span>Use o pacote RtecNocAgent-1.1.0-win-x64.zip, substitua o appsettings.json por este conteudo e execute install-agent.ps1 como administrador na maquina do cliente. O instalador aplica uma identificação visual limpa na área de trabalho.</span>
      </div>

      <div className="ops-note-card">
        <strong>Plano de fundo definido pelo NOC</strong>
        <span>
          {props.wallpaper.mode === 'rtec'
            ? 'Usar fundo limpo padrão RTEC.'
            : props.wallpaper.mode === 'current'
              ? 'Manter o wallpaper atual da máquina e aplicar apenas o cartão do agente.'
              : `Usar imagem local: ${props.wallpaper.imagePath || 'caminho não informado'}`}
        </span>
      </div>
    </div>
  );
}

export function TenantAgentManager(props: {
  agent: TenantAgentDetail;
  devices: DeviceRow[];
  officialPackage: OfficialAgentPackage;
  tenantId: string;
  tenantName: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<TenantAgentProvisionResult | null>(null);
  const [wallpaperMode, setWallpaperMode] = useState<AgentWallpaperConfig['mode']>('current');
  const [wallpaperResult, setWallpaperResult] = useState<AgentWallpaperConfig>({
    imagePath: '',
    mode: 'current',
  });
  const coverageRatio = props.agent.summary.provisionedDevices > 0
    ? Math.round((props.agent.summary.onlineDevices / props.agent.summary.provisionedDevices) * 100)
    : 0;

  async function handleProvision(formData: FormData) {
    setWorking(true);
    setErrorMsg('');
    setSuccessMsg('');
    const requestedWallpaperMode = String(formData.get('wallpaper_mode') ?? 'rtec') as AgentWallpaperConfig['mode'];
    const requestedWallpaperPath = String(formData.get('wallpaper_image_path') ?? '').trim();

    const response = await provisionTenantAgentAction(formData);
    setWorking(false);

    if ('error' in response) {
      setErrorMsg(response.error);
      return;
    }

    setResult(response);
    setWallpaperResult({
      imagePath: requestedWallpaperPath,
      mode: requestedWallpaperMode === 'current' || requestedWallpaperMode === 'custom' ? requestedWallpaperMode : 'rtec',
    });
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
    setWallpaperResult({
      imagePath: '',
      mode: 'current',
    });
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
        ? <TokenResultPanel result={result} tenantName={props.tenantName} wallpaper={wallpaperResult} />
        : null}

      <section className="agent-official-package">
        <div>
          <div className="page-hero__eyebrow">Pacote oficial versionado</div>
          <h3 className="agent-official-package__title">{props.officialPackage.fileName}</h3>
          <p className="agent-official-package__description">
            Baixe o instalador oficial uma vez e combine com o pacote de configuração gerado para cada empresa ou máquina.
          </p>
        </div>

        <div className="agent-official-package__meta">
          <span>
            Versão
            {' '}
            {props.officialPackage.version}
          </span>
          <span>
            Atualizado
            {' '}
            {props.officialPackage.updatedAt}
          </span>
          <span>
            SHA256
            {' '}
            {props.officialPackage.sha256 || 'não configurado'}
          </span>
        </div>

        <div className="agent-official-package__actions">
          {props.officialPackage.url
            ? (
                <a className="agent-primary-button" href={props.officialPackage.url} rel="noreferrer" target="_blank">
                  <Download size={15} />
                  Baixar pacote oficial
                </a>
              )
            : (
                <button className="agent-primary-button" disabled type="button">
                  <Download size={15} />
                  URL não configurada
                </button>
              )}
          <span className="agent-official-package__hint">
            Configure `NOC_AGENT_PACKAGE_URL` na VPS para publicar o link oficial.
          </span>
        </div>
      </section>

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
            <span className="tenant-alert-block__signal">Identificação visual integrada</span>
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

                  <label className="agent-modal__field">
                    <span>Plano de fundo da área de trabalho</span>
                    <select
                      name="wallpaper_mode"
                      onChange={event => setWallpaperMode(event.target.value as AgentWallpaperConfig['mode'])}
                      value={wallpaperMode}
                    >
                      <option value="current">Manter wallpaper atual da máquina</option>
                      <option value="rtec">Fundo padrão RTEC limpo</option>
                      <option value="custom">Usar imagem local informada abaixo</option>
                    </select>
                  </label>

                  {wallpaperMode === 'custom'
                    ? (
                        <label className="agent-modal__field">
                          <span>Caminho local da imagem</span>
                          <input
                            name="wallpaper_image_path"
                            placeholder="wallpaper.jpg ou C:\\Rtec\\NOC\\wallpaper.jpg"
                            type="text"
                          />
                        </label>
                      )
                    : <input name="wallpaper_image_path" type="hidden" value="" />}

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
