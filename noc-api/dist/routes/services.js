import { Router } from 'express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { devices, incidentDevices, incidents, serviceDevices, services, } from '../db/schema.js';
const router = Router();
const CRITICIDADES = ['baixa', 'media', 'alta', 'critica'];
/** GET /services – lista todos os serviços. */
router.get('/', async (_req, res) => {
    try {
        const list = await db.select().from(services).orderBy(services.nome);
        res.json({ services: list });
    }
    catch (err) {
        console.error('list services error:', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'Internal server error',
        });
    }
});
/** POST /services – cadastra um serviço. Body: { nome, criticidade }. */
router.post('/', async (req, res) => {
    try {
        const { nome, criticidade } = req.body;
        if (!nome || typeof nome !== 'string') {
            res.status(400).json({ error: 'nome is required' });
            return;
        }
        if (!criticidade ||
            typeof criticidade !== 'string' ||
            !CRITICIDADES.includes(criticidade)) {
            res.status(400).json({
                error: `criticidade must be one of: ${CRITICIDADES.join(', ')}`,
            });
            return;
        }
        const [service] = await db
            .insert(services)
            .values({
            nome: nome.trim(),
            criticidade: criticidade,
        })
            .returning();
        res.status(201).json(service);
    }
    catch (err) {
        console.error('create service error:', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'Internal server error',
        });
    }
});
/** GET /services/:id – detalhe do serviço com dispositivos e incidentes abertos. */
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const [service] = await db.select().from(services).where(eq(services.id, id)).limit(1);
        if (!service) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }
        const links = await db
            .select({ deviceId: serviceDevices.deviceId })
            .from(serviceDevices)
            .where(eq(serviceDevices.serviceId, id));
        const deviceIds = links.map((l) => l.deviceId);
        const flatDevices = deviceIds.length > 0
            ? await db.select().from(devices).where(inArray(devices.id, deviceIds))
            : [];
        const openIncidents = await db
            .select({
            id: incidents.id,
            titulo: incidents.titulo,
            severidade: incidents.severidade,
            status: incidents.status,
            startedAt: incidents.startedAt,
            impactoOperacional: incidents.impactoOperacional,
            confiancaDiagnostico: incidents.confiancaDiagnostico,
        })
            .from(incidents)
            .innerJoin(incidentDevices, eq(incidents.id, incidentDevices.incidentId))
            .where(eq(incidents.status, 'open'))
            .orderBy(desc(incidents.startedAt))
            .limit(10);
        const incidentIds = [...new Set(openIncidents.map((i) => i.id))];
        const incidentDeviceIds = new Map();
        for (const incId of incidentIds) {
            const devs = await db
                .select({ deviceId: incidentDevices.deviceId })
                .from(incidentDevices)
                .where(eq(incidentDevices.incidentId, incId));
            incidentDeviceIds.set(incId, devs.map((d) => d.deviceId));
        }
        const incidentsWithDevices = openIncidents
            .filter((i) => {
            const devs = incidentDeviceIds.get(i.id) ?? [];
            return devs.some((d) => deviceIds.includes(d));
        })
            .map((i) => ({
            ...i,
            deviceIds: incidentDeviceIds.get(i.id) ?? [],
        }));
        res.json({
            service: {
                id: service.id,
                nome: service.nome,
                criticidade: service.criticidade,
            },
            devices: flatDevices,
            openIncidents: incidentsWithDevices,
        });
    }
    catch (err) {
        console.error('get service error:', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'Internal server error',
        });
    }
});
/** POST /services/:id/devices – associa dispositivo ao serviço. Body: { device_id }. */
router.post('/:id/devices', async (req, res) => {
    try {
        const serviceId = req.params.id;
        const { device_id: deviceId } = req.body;
        if (!deviceId || typeof deviceId !== 'string') {
            res.status(400).json({ error: 'device_id is required' });
            return;
        }
        const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
        if (!service) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }
        const [device] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
        if (!device) {
            res.status(404).json({ error: 'Device not found' });
            return;
        }
        await db.insert(serviceDevices).values({ serviceId, deviceId }).onConflictDoNothing();
        res.status(201).json({ ok: true, serviceId, deviceId });
    }
    catch (err) {
        console.error('add device to service error:', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'Internal server error',
        });
    }
});
/** DELETE /services/:id/devices/:deviceId – remove dispositivo do serviço. */
router.delete('/:id/devices/:deviceId', async (req, res) => {
    try {
        const { id: serviceId, deviceId } = req.params;
        await db
            .delete(serviceDevices)
            .where(and(eq(serviceDevices.serviceId, serviceId), eq(serviceDevices.deviceId, deviceId)));
        res.status(204).send();
    }
    catch (err) {
        console.error('remove device from service error:', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'Internal server error',
        });
    }
});
export default router;
//# sourceMappingURL=services.js.map