import type { DiagnosticContext } from './types.js';
import type { NewIncident } from './types.js';
/**
 * Regras retornam zero ou mais incidentes. Sem side-effect; apenas interpretam o contexto.
 * Objetivo: impacto operacional, não falha de dispositivo. Menos alertas, mais explicações.
 */
/** Várias câmeras (ou dispositivos) do mesmo serviço pararam → serviço indisponível. */
export declare function ruleServiceDown(ctx: DiagnosticContext): NewIncident[];
/** Gateway (router) offline + vários dispositivos no mesmo site/área → queda geral de conectividade. */
export declare function ruleSiteConnectivityDown(ctx: DiagnosticContext): NewIncident[];
/** Latência alta sem queda → degradação perceptível ao usuário. */
export declare function ruleUserPerceptibleDegradation(ctx: DiagnosticContext): NewIncident[];
/** Múltiplos dispositivos offline na mesma área (sem necessariamente ser gateway) → possível queda de energia/uplink. */
export declare function ruleAreaOutage(ctx: DiagnosticContext): NewIncident[];
export declare const allRules: (typeof ruleServiceDown)[];
//# sourceMappingURL=rules.d.ts.map