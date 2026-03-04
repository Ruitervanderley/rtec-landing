'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export function DashboardCharts({ 
  online, 
  offline, 
  backupsSuccess, 
  backupsFailed 
}: { 
  online: number; 
  offline: number; 
  backupsSuccess: number; 
  backupsFailed: number; 
}) {
  const deviceData = [
    { name: 'Online', value: online },
    { name: 'Offline', value: offline },
  ];

  const backupData = [
    { name: 'Sucesso', value: backupsSuccess },
    { name: 'Falha', value: backupsFailed },
  ];

  const DEVICE_COLORS = ['#10b981', '#f43f5e'];
  const BACKUP_COLORS = ['#3b82f6', '#f59e0b'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', padding: '0.75rem 1rem', border: 'none', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontWeight: 600 }}>
          <p style={{ margin: 0, color: payload[0].payload.fill }}>
            {`${payload[0].name} : ${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      
      {/* Chart 1: Devices */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', padding: '1.5rem' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Saúde dos Dispositivos
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Backups */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px', padding: '1.5rem' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Performance de Backups (24h)
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={backupData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {backupData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BACKUP_COLORS[index % BACKUP_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
