import { Router, type Request, type Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { devices, events, incidentDevices, incidents } from '../db/schema.js';

const router = Router();

/**
 * GET /devices/:id/status
 * Returns current interpreted status for the device (last events + open incidents).
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);

    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const lastEvents = await db
      .select({
        tipo: events.tipo,
        valor: events.valor,
        timestamp: events.timestamp,
      })
      .from(events)
      .where(eq(events.deviceId, id))
      .orderBy(desc(events.timestamp))
      .limit(20);

    const openIncidents = await db
      .select({
        id: incidents.id,
        titulo: incidents.titulo,
        severidade: incidents.severidade,
        status: incidents.status,
        startedAt: incidents.startedAt,
      })
      .from(incidents)
      .innerJoin(incidentDevices, eq(incidents.id, incidentDevices.incidentId))
      .where(
        and(
          eq(incidentDevices.deviceId, id),
          eq(incidents.status, 'open'),
        ),
      );

    const hasRecentOffline =
      lastEvents.some(
        (e) =>
          e.tipo === 'offline' || e.tipo === 'ping_fail',
      );
    const lastEvent = lastEvents[0];
    const interpreted =
      openIncidents.length > 0
        ? 'incident'
        : hasRecentOffline
          ? 'degraded'
          : lastEvent
            ? 'ok'
            : 'unknown';

    res.json({
      device: {
        id: device.id,
        nome: device.nome,
        tipo: device.tipo,
        local: device.local,
        ip: device.ip,
      },
      status: {
        interpreted,
        lastEvents: lastEvents.slice(0, 10),
        openIncidents: openIncidents.map((i) => ({
          id: i.id,
          titulo: i.titulo,
          severidade: i.severidade,
          status: i.status,
          startedAt: i.startedAt,
        })),
      },
    });
  } catch (err) {
    console.error('get device status error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

export default router;
