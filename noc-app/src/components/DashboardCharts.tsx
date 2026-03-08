'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const DEVICE_COLORS = {
  Offline: '#f43f5e',
  Online: '#10b981',
};

const BACKUP_COLORS = {
  Falha: '#f59e0b',
  Sucesso: '#3b82f6',
};

export function DashboardCharts(props: {
  backupsFailed: number;
  backupsSuccess: number;
  offline: number;
  online: number;
}) {
  const deviceData = [
    { name: 'Online', value: props.online },
    { name: 'Offline', value: props.offline },
  ];
  const backupData = [
    { name: 'Sucesso', value: props.backupsSuccess },
    { name: 'Falha', value: props.backupsFailed },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gap: '1.25rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        marginBottom: '2rem',
      }}
    >
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', padding: '1.5rem' }}>
        <div
          style={{
            color: 'var(--text-primary)',
            fontSize: '1.05rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '1rem',
          }}
        >
          Saude dos dispositivos
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={deviceData}
                dataKey="value"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                stroke="none"
              >
                {deviceData.map(entry => (
                  <Cell key={entry.name} fill={DEVICE_COLORS[entry.name as keyof typeof DEVICE_COLORS]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend height={36} iconType="circle" verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', padding: '1.5rem' }}>
        <div
          style={{
            color: 'var(--text-primary)',
            fontSize: '1.05rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '1rem',
          }}
        >
          Performance de backups (24h)
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={backupData}
                dataKey="value"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                stroke="none"
              >
                {backupData.map(entry => (
                  <Cell key={entry.name} fill={BACKUP_COLORS[entry.name as keyof typeof BACKUP_COLORS]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend height={36} iconType="circle" verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
