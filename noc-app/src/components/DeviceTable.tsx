'use client';

import type { DeviceRow } from '@/lib/ops-api';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

type DeviceTableProps = {
  devices: DeviceRow[];
  error?: string | null;
  revokeDeviceAction?: (formData: FormData) => Promise<void>;
};

export function DeviceTable({ devices, error, revokeDeviceAction }: DeviceTableProps) {
  return (
    <section>
      {error
        ? (
            <div className="card" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )
        : null}

      <div className="table-wrapper">
        <table className="base-table" style={{ minWidth: 1200 }}>
          <thead>
            <tr>
              {['Tenant', 'Device ID', 'Designação', 'Versão App', 'IP/User', 'Uptime', 'CPU', 'RAM', 'Disco C:', 'Online', 'Última Ação', 'Último Heartbeat', 'Ações de Segurança'].map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(devices) ? devices : []).map(device => (
              <tr key={device.id}>
                <td style={{ fontWeight: 600 }}>{device.tenant_name}</td>
                <td style={{ fontFamily: 'Consolas, monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{device.device_id}</td>
                <td style={{ fontWeight: 500 }}>{device.device_name || '--'}</td>
                <td>
                  {device.app_version
                    ? (
                        <span className="badge badge-neutral">{device.app_version}</span>
                      )
                    : '--'}
                </td>
                <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  <div>
                    {'User: '}
                    {device.logged_in_user || '--'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {'IP: '}
                    {device.local_ip || '--'}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {'MAC: '}
                    {device.mac_address || '--'}
                  </div>
                </td>
                <td>
                  {device.uptime_seconds
                    ? (
                        <span className="badge badge-neutral">
                          {Math.floor(Number(device.uptime_seconds) / 3600)}
                          {'h '}
                          {Math.floor((Number(device.uptime_seconds) % 3600) / 60)}
                          m
                        </span>
                      )
                    : '--'}
                </td>
                <td>
                  {device.cpu_usage_percent
                    ? (
                        <span className={`badge ${Number.parseFloat(device.cpu_usage_percent) > 90 ? 'badge-error' : 'badge-neutral'}`}>
                          {device.cpu_usage_percent}
                          %
                        </span>
                      )
                    : '--'}
                </td>
                <td>
                  {device.ram_used_mb && device.ram_total_mb
                    ? (
                        <span className={`badge ${(Number.parseFloat(device.ram_used_mb) / Number.parseFloat(device.ram_total_mb)) * 100 > 90 ? 'badge-error' : 'badge-neutral'}`}>
                          {Math.round(Number.parseFloat(device.ram_used_mb) / 1024)}
                          {' GB / '}
                          {Math.round(Number.parseFloat(device.ram_total_mb) / 1024)}
                          {' GB'}
                        </span>
                      )
                    : '--'}
                </td>
                <td>
                  {device.disk_c_free_percent
                    ? (
                        <span className={`badge ${Number.parseFloat(device.disk_c_free_percent) < 10 ? 'badge-error' : 'badge-neutral'}`}>
                          {'Livre: '}
                          {device.disk_c_free_percent}
                          %
                        </span>
                      )
                    : '--'}
                </td>

                <td>
                  <span className={`badge ${device.is_online ? 'badge-success' : 'badge-error'}`}>
                    {device.is_online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={device.last_status || ''}>
                  {device.last_status || '--'}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDateTime(device.last_seen_at)}</td>
                <td>
                  {revokeDeviceAction && (
                    <form action={revokeDeviceAction}>
                      <input type="hidden" name="devicePk" value={device.id} />
                      <button
                        type="submit"
                        className="btn-revoke"
                      >
                        <ShieldAlert size={14} />
                        Revogar Acesso
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!error && devices.length === 0 && (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Nenhum Dispositivo provisionado no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
