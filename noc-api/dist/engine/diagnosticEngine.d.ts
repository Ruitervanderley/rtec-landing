/**
 * Motor de diagnóstico orientado a impacto operacional.
 * Fluxo: contexto (eventos + dispositivos + áreas + serviços) → regras (sem side-effect) → criação de incidentes.
 * Escalável: novas regras são funções que recebem DiagnosticContext e retornam NewIncident[].
 */
export declare function runDiagnosticEngine(): Promise<void>;
//# sourceMappingURL=diagnosticEngine.d.ts.map