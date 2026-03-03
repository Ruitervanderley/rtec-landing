import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { incidentDevices, incidents } from '../db/schema.js';
const router = Router();
/**
 * GET /incidents
 * Query: ?status=open|investigating|resolved (optional), ?limit=50 (optional)
 * Returns list of incidents (processed by the diagnostic engine).
 */
router.get('/', async (req, res) => {
    try {
        const status = req.query.status;
        const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100);
        const list = status === 'open' ||
            status === 'investigating' ||
            status === 'resolved'
            ? await db
                .select()
                .from(incidents)
                .where(eq(incidents.status, status))
                .orderBy(desc(incidents.startedAt))
                .limit(limit)
            : await db
                .select()
                .from(incidents)
                .orderBy(desc(incidents.startedAt))
                .limit(limit);
        const withDevices = await Promise.all(list.map(async (inc) => {
            const links = await db
                .select({ deviceId: incidentDevices.deviceId })
                .from(incidentDevices)
                .where(eq(incidentDevices.incidentId, inc.id));
            return {
                ...inc,
                deviceIds: links.map((l) => l.deviceId),
            };
        }));
        res.json({ incidents: withDevices });
    }
    catch (err) {
        console.error('get incidents error:', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'Internal server error',
        });
    }
});
export default router;
//# sourceMappingURL=incidents.js.map