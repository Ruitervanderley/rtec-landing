import type { DeviceRow } from '@/lib/ops-api';

export const DEVICE_HEALTH_THRESHOLDS = {
  cpuWarningPercent: 85,
  diskFreeWarningPercent: 15,
  ramWarningPercent: 90,
  staleHeartbeatMinutes: 30,
} as const;

export function toMetricNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getRamUsagePercent(device: DeviceRow) {
  const used = toMetricNumber(device.ram_used_mb);
  const total = toMetricNumber(device.ram_total_mb);

  if (used === null || total === null || total <= 0) {
    return null;
  }

  return (used / total) * 100;
}

export function hasStaleHeartbeat(device: DeviceRow, referenceTime = Date.now()) {
  return !device.last_seen_at
    || new Date(device.last_seen_at).getTime() < referenceTime - (DEVICE_HEALTH_THRESHOLDS.staleHeartbeatMinutes * 60 * 1000);
}

export function getDeviceHealthSignals(device: DeviceRow, referenceTime = Date.now()) {
  const cpu = toMetricNumber(device.cpu_usage_percent);
  const diskFree = toMetricNumber(device.disk_c_free_percent);
  const ramUsage = getRamUsagePercent(device);
  const signals: string[] = [];

  if (!device.is_online) {
    signals.push('Offline');
  }

  if (hasStaleHeartbeat(device, referenceTime)) {
    signals.push('Heartbeat atrasado');
  }

  if (cpu !== null && cpu >= DEVICE_HEALTH_THRESHOLDS.cpuWarningPercent) {
    signals.push(`CPU ${cpu.toFixed(1)}%`);
  }

  if (ramUsage !== null && ramUsage >= DEVICE_HEALTH_THRESHOLDS.ramWarningPercent) {
    signals.push(`RAM ${ramUsage.toFixed(1)}%`);
  }

  if (diskFree !== null && diskFree < DEVICE_HEALTH_THRESHOLDS.diskFreeWarningPercent) {
    signals.push(`Disco C ${diskFree.toFixed(1)}% livre`);
  }

  return signals;
}

export function getDeviceOperationalStatus(device: DeviceRow, referenceTime = Date.now()) {
  const signals = getDeviceHealthSignals(device, referenceTime);

  if (!device.is_online) {
    return {
      badgeClass: 'badge-error',
      key: 'offline',
      label: 'Offline',
      priority: 0,
      signals,
    } as const;
  }

  if (signals.length > 0) {
    return {
      badgeClass: 'badge-warning',
      key: 'attention',
      label: 'Atencao',
      priority: 1,
      signals,
    } as const;
  }

  return {
    badgeClass: 'badge-success',
    key: 'healthy',
    label: 'Saudavel',
    priority: 2,
    signals,
  } as const;
}
