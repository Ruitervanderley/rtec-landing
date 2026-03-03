import { Router } from 'express';
import { db } from '../db/index.js';
import { devices } from '../db/schema.js';
const router = Router();
const DEVICE_TYPES = ['router', 'camera', 'switch', 'server'];
/**
 * POST /devices
 * Body: { nome: string, tipo: DeviceType, local: string, ip: string, cliente_id?: string }
 * Creates a device (for seeding/simulation). No auth.
 */
router.post('/', async (req, res) => {
    try {
        const { nome, tipo, local, ip, cliente_id: clienteId } = req.body;
        if (!nome || typeof nome !== 'string') {
            res.status(400).json({ error: 'nome is required' });
            return;
        }
        if (!tipo ||
            typeof tipo !== 'string' ||
            !DEVICE_TYPES.includes(tipo)) {
            res.status(400).json({
                error: `tipo must be one of: ${DEVICE_TYPES.join(', ')}`,
            });
            return;
        }
        if (!local || typeof local !== 'string') {
            res.status(400).json({ error: 'local is required' });
            return;
        }
        if (!ip || typeof ip !== 'string') {
            res.status(400).json({ error: 'ip is required' });
            return;
        }
        const [device] = await db
            .insert(devices)
            .values({
            nome,
            tipo: tipo,
            local,
            ip,
            clienteId: clienteId ?? null,
        })
            .returning();
        res.status(201).json(device);
    }
    catch (err) {
        console.error('create device error:', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'Internal server error',
        });
    }
});
export default router;
//# sourceMappingURL=devicesCreate.js.map