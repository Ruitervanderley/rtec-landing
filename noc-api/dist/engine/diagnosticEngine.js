import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { incidentDevices, incidents, } from '../db/schema.js';
import { buildDiagnosticContext } from './buildContext.js';
import { allRules } from './rules.js';
/**
 * Motor de diagnóstico orientado a impacto operacional.
 * Fluxo: contexto (eventos + dispositivos + áreas + serviços) → regras (sem side-effect) → criação de incidentes.
 * Escalável: novas regras são funções que recebem DiagnosticContext e retornam NewIncident[].
 */
export async function runDiagnosticEngine() {
    const ctx = await buildDiagnosticContext();
    if (!ctx) {
        return;
    }
    const candidates = [];
    for (const rule of allRules) {
        const incidentsFromRule = rule(ctx);
        candidates.push(...incidentsFromRule);
    }
    for (const inc of candidates) {
        const alreadyOpen = await hasOpenIncidentForDevices(inc.deviceIds);
        if (alreadyOpen) {
            continue;
        }
        await createIncident(inc);
    }
}
async function hasOpenIncidentForDevices(deviceIds) {
    for (const deviceId of deviceIds) {
        const open = await db
            .select({ id: incidents.id })
            .from(incidents)
            .innerJoin(incidentDevices, eq(incidents.id, incidentDevices.incidentId))
            .where(and(eq(incidents.status, 'open'), eq(incidentDevices.deviceId, deviceId)))
            .limit(1);
        if (open.length > 0) {
            return true;
        }
    }
    return false;
}
async function createIncident(inc) {
    const [incident] = await db
        .insert(incidents)
        .values({
        titulo: inc.titulo,
        descricao: inc.descricao,
        severidade: inc.severidade,
        status: 'open',
        causaProvavel: inc.causaProvavel,
        impactoCliente: inc.impactoCliente,
        impactoOperacional: inc.impactoOperacional,
        usuarioAfetado: inc.usuarioAfetado,
        acaoRecomendada: inc.acaoRecomendada,
        confiancaDiagnostico: inc.confiancaDiagnostico,
    })
        .returning({ id: incidents.id });
    if (!incident) {
        return;
    }
    for (const deviceId of inc.deviceIds) {
        await db.insert(incidentDevices).values({
            incidentId: incident.id,
            deviceId,
        });
    }
}
//# sourceMappingURL=diagnosticEngine.js.map