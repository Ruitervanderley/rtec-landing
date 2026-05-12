'use client';

import type { DeviceRow } from '@/lib/ops-api';
import { AlertCircle, ArrowUpRight, Clock3, ShieldAlert, UserRound, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { getDeviceOperationalStatus, getRamUsagePercent, toMetricNumber } from '@/lib/device-health';
import { formatDateTime, formatDurationSeconds } from '@/lib/format';

type DeviceTableProps = {
  devices: DeviceRow[];
  error?: string | null;
  revokeDeviceAction?: (formData: FormData) => Promise<void>;
};

type TenantGroup = {
  attentionCount: number;
  devices: DeviceRow[];
  offlineCount: number;
  onlineCount: number;
  tenantId: string;
  tenantName: string;
};

function getTenantAnchor(props: { tenantId: string }) {
  return `tenant-${props.tenantId}`;
}

function getAttentionState(device: DeviceRow) {
  const status = getDeviceOperationalStatus(device);
  return {
    badgeClass: status.badgeClass,
    label: status.label,
    needsAttention: status.key !== 'healthy',
    signals: status.signals,
  };
}

function getOperationalStatusLabel(device: DeviceRow) {
  if (!device.is_online) {
    return 'OFFLINE';
  }

  const normalized = (device.last_status ?? '').trim().toUpperCase();
  return normalized || 'ONLINE';
}

function getMetricTone(props: { status: 'danger' | 'warning' | 'default' }) {
  if (props.status === 'danger') {
    return 'metric-pill metric-pill--danger';
  }

  if (props.status === 'warning') {
    return 'metric-pill metric-pill--warning';
  }

  return 'metric-pill';
}

function formatRam(device: DeviceRow) {
  const used = toMetricNumber(device.ram_used_mb);
  const total = toMetricNumber(device.ram_total_mb);

  if (used === null || total === null || total <= 0) {
    return '--';
  }

  return `${(used / 1024).toFixed(1)} GB / ${(total / 1024).toFixed(1)} GB`;
}

function groupDevices(devices: DeviceRow[]) {
  const groups = new Map<string, TenantGroup>();

  devices.forEach((device) => {
    const key = device.tenant_id || device.tenant_name;
    const existing = groups.get(key);
    const attentionState = getAttentionState(device);

    if (existing) {
      existing.devices.push(device);
      existing.onlineCount += device.is_online ? 1 : 0;
      existing.offlineCount += device.is_online ? 0 : 1;
      existing.attentionCount += attentionState.needsAttention ? 1 : 0;
      return;
    }

    groups.set(key, {
      attentionCount: attentionState.needsAttention ? 1 : 0,
      devices: [device],
      offlineCount: device.is_online ? 0 : 1,
      onlineCount: device.is_online ? 1 : 0,
      tenantId: device.tenant_id,
      tenantName: device.tenant_name,
    });
  });

  return Array.from(groups.values()).sort((left, right) => {
    if (right.attentionCount !== left.attentionCount) {
      return right.attentionCount - left.attentionCount;
    }

    if (right.offlineCount !== left.offlineCount) {
      return right.offlineCount - left.offlineCount;
    }

    if (right.onlineCount !== left.onlineCount) {
      return right.onlineCount - left.onlineCount;
    }

    if (right.devices.length !== left.devices.length) {
      return right.devices.length - left.devices.length;
    }

    return left.tenantName.localeCompare(right.tenantName, 'pt-BR');
  });
}

export function DeviceTable(props: DeviceTableProps) {
  const devices = Array.isArray(props.devices) ? props.devices : [];
  const tenantGroups = groupDevices(devices);
  const totalOnline = devices.filter(device => device.is_online).length;
  const totalAttention = devices.filter(device => getAttentionState(device).needsAttention).length;

  return (
    <section className="page-stack">
      {props.error
        ? (
            <div className="alert-panel alert-panel--error">
              <AlertCircle size={20} />
              {props.error}
            </div>
          )
        : null}

      {!props.error && devices.length > 0
        ? (
            <>
              <div className="summary-strip">
                <div className="summary-card">
                  <span className="summary-card__label">Empresas monitoradas</span>
                  <strong className="summary-card__value">{tenantGroups.length}</strong>
                  <div className="summary-card__meta">Cada tenant agora aparece em um bloco proprio.</div>
                </div>
                <div className="summary-card">
                  <span className="summary-card__label">Dispositivos ativos</span>
                  <strong className="summary-card__value">{devices.length}</strong>
                  <div className="summary-card__meta">Total provisionado e visivel na frota.</div>
                </div>
                <div className="summary-card">
                  <span className="summary-card__label">Online agora</span>
                  <strong className="summary-card__value">{totalOnline}</strong>
                  <div className="summary-card__meta">
                    {devices.length - totalOnline}
                    {' offline ou sem heartbeat recente.'}
                  </div>
                </div>
                <div className="summary-card">
                  <span className="summary-card__label">Precisando atencao</span>
                  <strong className="summary-card__value">{totalAttention}</strong>
                  <div className="summary-card__meta">Offline, disco baixo, CPU alta ou RAM sob pressao.</div>
                </div>
              </div>

              <div className="fleet-nav">
                {tenantGroups.map(group => (
                  <a
                    key={group.tenantId}
                    className="fleet-nav__chip"
                    href={`#${getTenantAnchor({ tenantId: group.tenantId })}`}
                  >
                    <strong>{group.tenantName}</strong>
                    <span>
                      {group.onlineCount}
                      {' online de '}
                      {group.devices.length}
                    </span>
                  </a>
                ))}
              </div>

              <div className="stack-list">
                {tenantGroups.map((group) => {
                  const sortedDevices = [...group.devices].sort((left, right) => {
                    const leftAttention = getAttentionState(left);
                    const rightAttention = getAttentionState(right);

                    if (leftAttention.needsAttention !== rightAttention.needsAttention) {
                      return leftAttention.needsAttention ? -1 : 1;
                    }

                    if (left.is_online !== right.is_online) {
                      return left.is_online ? 1 : -1;
                    }

                    return (right.last_seen_at ?? '').localeCompare(left.last_seen_at ?? '');
                  });

                  return (
                    <article
                      key={group.tenantId}
                      className="fleet-group"
                      id={getTenantAnchor({ tenantId: group.tenantId })}
                    >
                      <div className="fleet-group__header">
                        <div>
                          <div className="page-hero__eyebrow">Empresa monitorada</div>
                          <h2 className="fleet-group__title">{group.tenantName}</h2>
                          <p className="fleet-group__description">
                            {group.devices.length}
                            {' dispositivo(s), '}
                            {group.onlineCount}
                            {' online e '}
                            {group.devices.length - group.onlineCount}
                            {' fora do ar neste momento.'}
                          </p>
                        </div>

                        <div className="page-hero__actions">
                          <div className="fleet-group__stats">
                            <span className="tenant-stat">
                              <Wifi size={14} />
                              {group.onlineCount}
                              {' online'}
                            </span>
                            <span className="tenant-stat">
                              <WifiOff size={14} />
                              {group.devices.length - group.onlineCount}
                              {' offline'}
                            </span>
                            <span className="tenant-stat">
                              <AlertCircle size={14} />
                              {group.attentionCount}
                              {' com atencao'}
                            </span>
                          </div>

                          <Link className="inline-link" href={`/tenants/${group.tenantId}`}>
                            Abrir tenant
                            <ArrowUpRight size={14} />
                          </Link>
                        </div>
                      </div>

                      <div className="device-grid">
                        {sortedDevices.map((device) => {
                          const attentionState = getAttentionState(device);
                          const cpu = toMetricNumber(device.cpu_usage_percent);
                          const diskFree = toMetricNumber(device.disk_c_free_percent);
                          const ramRatio = getRamUsagePercent(device);

                          return (
                            <article key={device.id} className="device-card">
                              <div className="device-card__header">
                                <div className="device-card__title">
                                  <strong className="device-card__name">{device.device_name || 'Dispositivo sem nome'}</strong>
                                  <span className="device-card__code">{device.device_id}</span>
                                </div>

                                <div className="device-card__header-meta">
                                  {device.app_version
                                    ? <span className="badge badge-neutral">{device.app_version}</span>
                                    : null}
                                  <span className={`badge ${attentionState.badgeClass}`}>
                                    {device.is_online ? <Wifi size={12} /> : <WifiOff size={12} />}
                                    {attentionState.label}
                                  </span>
                                </div>
                              </div>

                              <div className="metric-grid">
                                <div className={getMetricTone({
                                  status: cpu !== null && cpu >= 90 ? 'danger' : cpu !== null && cpu >= 70 ? 'warning' : 'default',
                                })}
                                >
                                  <div className="metric-pill__label">CPU</div>
                                  <div className="metric-pill__value">{cpu !== null ? `${cpu.toFixed(1)}%` : '--'}</div>
                                </div>

                                <div className={getMetricTone({
                                  status: ramRatio !== null && ramRatio >= 90 ? 'danger' : ramRatio !== null && ramRatio >= 75 ? 'warning' : 'default',
                                })}
                                >
                                  <div className="metric-pill__label">RAM</div>
                                  <div className="metric-pill__value">{formatRam(device)}</div>
                                </div>

                                <div className={getMetricTone({
                                  status: diskFree !== null && diskFree < 10 ? 'danger' : diskFree !== null && diskFree < 20 ? 'warning' : 'default',
                                })}
                                >
                                  <div className="metric-pill__label">Disco C</div>
                                  <div className="metric-pill__value">{diskFree !== null ? `${diskFree.toFixed(1)}% livre` : '--'}</div>
                                </div>

                                <div className="metric-pill">
                                  <div className="metric-pill__label">Uptime</div>
                                  <div className="metric-pill__value">
                                    {formatDurationSeconds(toMetricNumber(device.uptime_seconds) ?? null)}
                                  </div>
                                </div>
                              </div>

                              <div className="device-card__details">
                                {attentionState.signals.length > 0
                                  ? (
                                      <div className="device-card__attention">
                                        <strong>Atencao:</strong>
                                        {' '}
                                        {attentionState.signals.join(' · ')}
                                      </div>
                                    )
                                  : null}
                                <div>
                                  <strong>Usuario:</strong>
                                  {' '}
                                  <UserRound size={13} style={{ display: 'inline-flex', marginRight: '0.2rem', verticalAlign: 'text-bottom' }} />
                                  {device.logged_in_user || '--'}
                                </div>
                                <div>
                                  <strong>IP local:</strong>
                                  {' '}
                                  {device.local_ip || '--'}
                                </div>
                                <div>
                                  <strong>MAC:</strong>
                                  {' '}
                                  {device.mac_address || '--'}
                                </div>
                                <div>
                                  <strong>Status:</strong>
                                  {' '}
                                  {getOperationalStatusLabel(device)}
                                </div>
                              </div>

                              <div className="device-card__footer">
                                <div className="device-card__footer-copy">
                                  <span className="device-card__footer-label">Ultimo heartbeat</span>
                                  <span className="device-card__footer-value">
                                    <Clock3 size={13} style={{ display: 'inline-flex', marginRight: '0.3rem', verticalAlign: 'text-bottom' }} />
                                    {formatDateTime(device.last_seen_at)}
                                  </span>
                                </div>

                                {props.revokeDeviceAction
                                  ? (
                                      <form action={props.revokeDeviceAction}>
                                        <input name="devicePk" type="hidden" value={device.id} />
                                        <button className="badge badge-error" type="submit">
                                          <ShieldAlert size={12} />
                                          Revogar acesso
                                        </button>
                                      </form>
                                    )
                                  : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )
        : null}

      {!props.error && devices.length === 0
        ? (
            <div className="empty-state">
              Nenhum dispositivo provisionado no momento.
            </div>
          )
        : null}
    </section>
  );
}
