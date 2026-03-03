export type EventType
  = | 'ping_fail'
    | 'high_latency'
    | 'packet_loss'
    | 'offline'
    | 'temp_high';

export type Severity = 'info' | 'warning' | 'critical';

export type IncidentStatus = 'open' | 'investigating' | 'resolved';

export type ServiceCriticidade = 'baixa' | 'media' | 'alta' | 'critica';

export type NewIncident = {
  titulo: string;
  descricao: string;
  severidade: Severity;
  causaProvavel: string;
  impactoCliente: string;
  impactoOperacional: string;
  usuarioAfetado: string;
  acaoRecomendada: string;
  confiancaDiagnostico: number;
  deviceIds: string[];
};

/** Contexto enriquecido para regras: eventos recentes + dispositivos + áreas + sites + serviços. */
export type DiagnosticContext = {
  windowStart: Date;
  events: Array<{
    id: string;
    deviceId: string;
    tipo: EventType;
    valor: number | null;
    timestamp: Date;
    device: {
      id: string;
      nome: string;
      tipo: string;
      local: string;
      areaId: string | null;
      areaNome: string | null;
      siteNome: string | null;
      cliente: string | null;
    };
    serviceIds: string[];
    serviceNomes: string[];
  }>;
  /** Dispositivos offline (ping_fail/offline) na janela, agrupados por serviço. */
  offlineByService: Map<string, { deviceIds: string[]; serviceNome: string }>;
  /** Dispositivos offline por área. */
  offlineByArea: Map<string, { deviceIds: string[]; areaNome: string; siteNome: string }>;
  /** Dispositivos com alta latência (sem queda). */
  highLatencyOnly: Array<{ deviceId: string; deviceNome: string; serviceNomes: string[] }>;
  /** Gateway/router offline + total de devices no mesmo site. */
  gatewayOfflineSites: Array<{
    siteId: string;
    siteNome: string;
    offlineDeviceIds: string[];
    totalDevicesInSite: number;
  }>;
};
