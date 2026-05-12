'use client';

import type { DeviceRow } from '@/lib/ops-api';
import { AlertCircle, ArrowUpRight, Clock3, Cpu, HardDrive, Search, ShieldAlert, UserRound, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatDateTime, formatDurationSeconds } from '@/lib/format';

type TenantDeviceWorkspaceProps = {
  devices: DeviceRow[];
  error?: string | null;
  revokeDeviceAction?: (formData: FormData) => Promise<void>;
  tenantId: string;
  tenantName: string;
};

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRamRatio(device: DeviceRow) {
  const used = toNumber(device.ram_used_mb);
  const total = toNumber(device.ram_total_mb);

  if (used === null || total === null || total <= 0) {
    return null;
  }

  return (used / total) * 100;
}

function getOperationalStatus(device: DeviceRow) {
  const cpu = toNumber(device.cpu_usage_percent);
  const diskFree = toNumber(device.disk_c_free_percent);
  const ramRatio = getRamRatio(device);
  const staleHeartbeat = !device.last_seen_at || new Date(device.last_seen_at).getTime() < Date.now() - (30 * 60 * 1000);

  if (!device.is_online) {
    return {
      badgeClass: 'badge-error',
      key: 'offline',
      label: 'Offline',
      priority: 0,
    };
  }

  if (staleHeartbeat || (diskFree !== null && diskFree < 10) || (cpu !== null && cpu >= 90) || (ramRatio !== null && ramRatio >= 90)) {
    return {
      badgeClass: 'badge-warning',
      key: 'attention',
      label: 'Atencao',
      priority: 1,
    };
  }

  return {
    badgeClass: 'badge-success',
    key: 'healthy',
    label: 'Saudavel',
    priority: 2,
  };
}

function formatRam(device: DeviceRow) {
  const used = toNumber(device.ram_used_mb);
  const total = toNumber(device.ram_total_mb);

  if (used === null || total === null || total <= 0) {
    return '--';
  }

  return `${(used / 1024).toFixed(1)} GB / ${(total / 1024).toFixed(1)} GB`;
}

function getStatusCopy(device: DeviceRow) {
  if (!device.is_online) {
    return 'OFFLINE';
  }

  const normalized = (device.last_status ?? '').trim().toUpperCase();
  return normalized || 'ONLINE';
}

export function TenantDeviceWorkspace(props: TenantDeviceWorkspaceProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'attention'>('all');
  const [referenceTime] = useState(() => Date.now());

  const devices = Array.isArray(props.devices) ? props.devices : [];
  const normalizedQuery = query.trim().toLowerCase();

  let filteredDevices = devices.filter((device) => {
    const status = getOperationalStatus(device);

    if (filter === 'online' && !device.is_online) {
      return false;
    }

    if (filter === 'offline' && device.is_online) {
      return false;
    }

    if (filter === 'attention' && status.key !== 'attention' && status.key !== 'offline') {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      device.device_name,
      device.device_id,
      device.logged_in_user,
      device.local_ip,
      device.mac_address,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  filteredDevices = [...filteredDevices].sort((left, right) => {
    const leftStatus = getOperationalStatus(left);
    const rightStatus = getOperationalStatus(right);

    if (leftStatus.priority !== rightStatus.priority) {
      return leftStatus.priority - rightStatus.priority;
    }

    return (right.last_seen_at ?? '').localeCompare(left.last_seen_at ?? '');
  });

  const offlineDevices = devices.filter(device => !device.is_online).length;
  const attentionDevices = devices.filter((device) => {
    const status = getOperationalStatus(device);
    return status.key === 'attention' || status.key === 'offline';
  }).length;
  const onlineDevices = devices.filter(device => device.is_online).length;
  const staleDevices = devices.filter(device => !device.last_seen_at || new Date(device.last_seen_at).getTime() < referenceTime - (30 * 60 * 1000)).length;

  return (
    <section className="page-stack">
      {props.error
        ? (
            <div className="alert-panel alert-panel--error">
              <AlertCircle size={18} />
              {props.error}
            </div>
          )
        : null}

      <section className="card ops-section-card">
        <div className="ops-section-card__header">
          <div>
            <div className="page-hero__eyebrow">Workspace da frota</div>
            <h2 className="ops-section-card__title">Dispositivos conectados via NOC Agent</h2>
          </div>
          <Link className="inline-link" href={`/tenants/${props.tenantId}?tab=agent`}>
            Abrir NOC Agent
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <p className="ops-copy-muted">
          Esta area mostra apenas a frota da
          {' '}
          <strong>{props.tenantName}</strong>
          . Filtre por conectividade, encontre uma maquina especifica e trate os sinais de atencao primeiro.
        </p>

        <div className="summary-strip">
          <div className="summary-card">
            <span className="summary-card__label">Total da frota</span>
            <strong className="summary-card__value">{devices.length}</strong>
            <div className="summary-card__meta">Maquinas provisionadas para esta empresa.</div>
          </div>
          <div className="summary-card">
            <span className="summary-card__label">Online agora</span>
            <strong className="summary-card__value">{onlineDevices}</strong>
            <div className="summary-card__meta">
              {offlineDevices}
              {' fora do ar ou sem heartbeat.'}
            </div>
          </div>
          <div className="summary-card">
            <span className="summary-card__label">Precisando atencao</span>
            <strong className="summary-card__value">{attentionDevices}</strong>
            <div className="summary-card__meta">Offline, heartbeat atrasado ou recurso sob pressao.</div>
          </div>
          <div className="summary-card">
            <span className="summary-card__label">Heartbeat atrasado</span>
            <strong className="summary-card__value">{staleDevices}</strong>
            <div className="summary-card__meta">Sem atualizacao valida nos ultimos 30 minutos.</div>
          </div>
        </div>

        <div className="tenant-device-toolbar">
          <label className="tenant-device-search">
            <Search size={16} />
            <input
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar por nome, IP, usuario ou device ID"
              type="search"
              value={query}
            />
          </label>

          <div className="ops-tab-nav" aria-label="Filtros da frota">
            <button className={`ops-tab-nav__link ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')} type="button">
              Todos
            </button>
            <button className={`ops-tab-nav__link ${filter === 'attention' ? 'is-active' : ''}`} onClick={() => setFilter('attention')} type="button">
              Atencao
            </button>
            <button className={`ops-tab-nav__link ${filter === 'offline' ? 'is-active' : ''}`} onClick={() => setFilter('offline')} type="button">
              Offline
            </button>
            <button className={`ops-tab-nav__link ${filter === 'online' ? 'is-active' : ''}`} onClick={() => setFilter('online')} type="button">
              Online
            </button>
          </div>
        </div>
      </section>

      {filteredDevices.length === 0
        ? (
            <div className="empty-state">
              Nenhum dispositivo corresponde ao filtro atual para esta empresa.
            </div>
          )
        : (
            <div className="tenant-device-grid">
              {filteredDevices.map((device) => {
                const status = getOperationalStatus(device);
                const cpu = toNumber(device.cpu_usage_percent);
                const diskFree = toNumber(device.disk_c_free_percent);

                return (
                  <article className="tenant-device-card" key={device.id}>
                    <div className="tenant-device-card__header">
                      <div>
                        <strong className="tenant-device-card__title">{device.device_name || device.device_id}</strong>
                        <div className="tenant-device-card__subtitle">{device.device_id}</div>
                      </div>

                      <div className="tenant-device-card__badges">
                        {device.app_version
                          ? <span className="badge badge-neutral">{device.app_version}</span>
                          : null}
                        <span className={`badge ${status.badgeClass}`}>
                          {device.is_online ? <Wifi size={12} /> : <WifiOff size={12} />}
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <div className="tenant-device-card__metrics">
                      <div className="tenant-device-metric">
                        <span>CPU</span>
                        <strong>{cpu !== null ? `${cpu.toFixed(1)}%` : '--'}</strong>
                      </div>
                      <div className="tenant-device-metric">
                        <span>RAM</span>
                        <strong>{formatRam(device)}</strong>
                      </div>
                      <div className="tenant-device-metric">
                        <span>Disco C</span>
                        <strong>{diskFree !== null ? `${diskFree.toFixed(1)}% livre` : '--'}</strong>
                      </div>
                      <div className="tenant-device-metric">
                        <span>Uptime</span>
                        <strong>{formatDurationSeconds(toNumber(device.uptime_seconds) ?? null)}</strong>
                      </div>
                    </div>

                    <div className="tenant-device-card__details">
                      <div>
                        <UserRound size={14} />
                        <span>{device.logged_in_user || '--'}</span>
                      </div>
                      <div>
                        <Wifi size={14} />
                        <span>{device.local_ip || '--'}</span>
                      </div>
                      <div>
                        <HardDrive size={14} />
                        <span>{getStatusCopy(device)}</span>
                      </div>
                      <div>
                        <Cpu size={14} />
                        <span>{formatDateTime(device.last_seen_at)}</span>
                      </div>
                    </div>

                    <div className="tenant-device-card__footer">
                      <div className="tenant-device-card__owner">
                        <span className="page-hero__eyebrow">Responsavel</span>
                        <strong>{device.owner_display_name || device.owner_email || '--'}</strong>
                      </div>

                      <div className="tenant-device-card__actions">
                        <Link className="inline-link" href={`/tenants/${props.tenantId}/devices/${device.id}`}>
                          Abrir dispositivo
                          <ArrowUpRight size={14} />
                        </Link>

                        {props.revokeDeviceAction
                          ? (
                              <form action={props.revokeDeviceAction}>
                                <input name="devicePk" type="hidden" value={device.id} />
                                <button className="agent-secondary-button agent-secondary-button--danger" type="submit">
                                  <ShieldAlert size={14} />
                                  Revogar acesso
                                </button>
                              </form>
                            )
                          : null}
                      </div>
                    </div>

                    {status.key !== 'healthy'
                      ? (
                          <div className="tenant-device-card__alert">
                            <Clock3 size={14} />
                            {status.key === 'offline'
                              ? 'Sem comunicacao recente com o NOC Agent.'
                              : 'Existe degradacao de recursos ou heartbeat atrasado nesta maquina.'}
                          </div>
                        )
                      : null}
                  </article>
                );
              })}
            </div>
          )}
    </section>
  );
}
