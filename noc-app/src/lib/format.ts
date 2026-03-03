export function formatDateTime(value: string | null): string {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR');
}

export function formatDate(value: string | null): string {
  if (!value) {
    return '--';
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR');
}

export function formatBytes(value: number | null): string {
  if (value === null || value <= 0) {
    return '--';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let current = value;
  let index = 0;

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }

  const digits = current < 10 && index > 0 ? 1 : 0;
  return `${current.toFixed(digits)} ${units[index]}`;
}
