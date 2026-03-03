import type { DiagnosticContext, NewIncident } from './types.js';

const MIN_CAMERAS_SAME_SERVICE = 2;
const MIN_DEVICES_SAME_AREA = 2;
const CONFIDENCE_HIGH = 0.9;
const CONFIDENCE_MEDIUM = 0.7;

/**
 * Regras retornam zero ou mais incidentes. Sem side-effect; apenas interpretam o contexto.
 * Objetivo: impacto operacional, não falha de dispositivo. Menos alertas, mais explicações.
 */

/**
 * Várias câmeras (ou dispositivos) do mesmo serviço pararam → serviço indisponível.
 * @param ctx
 */
export function ruleServiceDown(ctx: DiagnosticContext): NewIncident[] {
  const out: NewIncident[] = [];
  for (const [, data] of ctx.offlineByService) {
    if (data.deviceIds.length < MIN_CAMERAS_SAME_SERVICE) {
      continue;
    }
    const serviceLabel
      = data.serviceNome.toLowerCase().includes('vigilância')
        || data.serviceNome.toLowerCase().includes('camera')
        ? 'Vigilância'
        : data.serviceNome;
    out.push({
      titulo: `${serviceLabel} indisponível`,
      descricao: `Múltiplos dispositivos do serviço "${data.serviceNome}" estão offline. O serviço pode estar indisponível para o usuário.`,
      severidade: 'critical',
      causaProvavel: 'Falha em múltiplos pontos do serviço ou infraestrutura compartilhada.',
      impactoCliente: `Serviço "${data.serviceNome}" possivelmente indisponível.`,
      impactoOperacional: `Serviço "${data.serviceNome}" indisponível. Usuários não conseguem utilizar o recurso.`,
      usuarioAfetado: `Clientes e usuários que dependem de ${data.serviceNome}.`,
      acaoRecomendada: 'Verificar infraestrutura comum (rede, energia) e priorizar restabelecimento dos dispositivos do serviço.',
      confiancaDiagnostico: CONFIDENCE_HIGH,
      deviceIds: data.deviceIds,
    });
  }
  return out;
}

/**
 * Gateway (router) offline + vários dispositivos no mesmo site/área → queda geral de conectividade.
 * @param ctx
 */
export function ruleSiteConnectivityDown(ctx: DiagnosticContext): NewIncident[] {
  const out: NewIncident[] = [];
  for (const site of ctx.gatewayOfflineSites) {
    if (site.offlineDeviceIds.length < MIN_DEVICES_SAME_AREA) {
      continue;
    }
    out.push({
      titulo: 'Queda geral de conectividade',
      descricao: `O gateway e outros dispositivos no site "${site.siteNome}" estão offline. Indica queda geral de conectividade no local.`,
      severidade: 'critical',
      causaProvavel: 'Queda de energia, falha no uplink ou no equipamento de acesso do site.',
      impactoCliente: 'Conectividade do site afetada. Serviços dependentes de rede indisponíveis.',
      impactoOperacional: 'Site sem conectividade. Serviços de rede e dependentes indisponíveis.',
      usuarioAfetado: `Todos os usuários do site ${site.siteNome}.`,
      acaoRecomendada: 'Verificar energia e link de rede do site. Priorizar restabelecimento do gateway.',
      confiancaDiagnostico: CONFIDENCE_HIGH,
      deviceIds: site.offlineDeviceIds,
    });
  }
  return out;
}

/**
 * Latência alta sem queda → degradação perceptível ao usuário.
 * @param ctx
 */
export function ruleUserPerceptibleDegradation(ctx: DiagnosticContext): NewIncident[] {
  const out: NewIncident[] = [];
  for (const dev of ctx.highLatencyOnly) {
    const serviceLabel
      = dev.serviceNomes.length > 0
        ? dev.serviceNomes.join(', ')
        : 'Conectividade';
    out.push({
      titulo: 'Degradação perceptível ao usuário',
      descricao: `O dispositivo "${dev.deviceNome}" apresenta latência alta sem queda. Usuários podem perceber lentidão.`,
      severidade: 'warning',
      causaProvavel: 'Congestionamento, interferência ou degradação do enlace. Sem perda total de serviço.',
      impactoCliente: 'Experiência degradada: lentidão ou atrasos perceptíveis.',
      impactoOperacional: 'Serviço operacional com degradação de qualidade. Impacto na experiência do usuário.',
      usuarioAfetado: `Usuários que utilizam recursos vinculados a ${serviceLabel}.`,
      acaoRecomendada: 'Monitorar tendência. Se persistir, verificar link e carga dos equipamentos.',
      confiancaDiagnostico: CONFIDENCE_MEDIUM,
      deviceIds: [dev.deviceId],
    });
  }
  return out;
}

/**
 * Múltiplos dispositivos offline na mesma área (sem necessariamente ser gateway) → possível queda de energia/uplink.
 * @param ctx
 */
export function ruleAreaOutage(ctx: DiagnosticContext): NewIncident[] {
  const out: NewIncident[] = [];
  for (const [, data] of ctx.offlineByArea) {
    if (data.deviceIds.length < MIN_DEVICES_SAME_AREA) {
      continue;
    }
    out.push({
      titulo: 'Queda provável de energia ou uplink',
      descricao: `Vários dispositivos na área "${data.areaNome}" estão offline no mesmo período. Possível queda de energia ou falha no uplink do local.`,
      severidade: 'critical',
      causaProvavel: 'Queda de energia ou falha no link de rede do local.',
      impactoCliente: 'Serviços no local afetados até restabelecimento.',
      impactoOperacional: 'Área afetada. Múltiplos dispositivos indisponíveis.',
      usuarioAfetado: `Usuários do local ${data.areaNome}.`,
      acaoRecomendada: 'Verificar energia e conectividade do local. Contatar responsável pelo site se necessário.',
      confiancaDiagnostico: CONFIDENCE_MEDIUM,
      deviceIds: data.deviceIds,
    });
  }
  return out;
}

export const allRules = [
  ruleServiceDown,
  ruleSiteConnectivityDown,
  ruleUserPerceptibleDegradation,
  ruleAreaOutage,
];
