import type { Request, Response } from 'express';
import type { EventType } from '../engine/types.js';
import { Router } from 'express';
import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { runDiagnosticEngine } from '../engine/diagnosticEngine.js';

const router = Router();

const EVENT_TYPES: EventType[] = [
  'ping_fail',
  'high_latency',
  'packet_loss',
  'offline',
  'temp_high',
];

/**
 * POST /ingest-event
 * Body: { device_id: string, tipo: EventType, valor?: number }
 * Receives events from the monitor agent and runs the diagnostic engine after insert.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { device_id: deviceId, tipo, valor } = req.body as {
      device_id?: string;
      tipo?: string;
      valor?: number;
    };

    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({
        error: 'device_id is required and must be a string (UUID)',
      });
      return;
    }

    if (
      !tipo
      || typeof tipo !== 'string'
      || !EVENT_TYPES.includes(tipo as EventType)
    ) {
      res.status(400).json({
        error: `tipo must be one of: ${EVENT_TYPES.join(', ')}`,
      });
      return;
    }

    await db.insert(events).values({
      deviceId,
      tipo: tipo as EventType,
      valor: typeof valor === 'number' ? valor : null,
    });

    await runDiagnosticEngine();

    res.status(202).json({ ok: true, message: 'Event ingested' });
  } catch (err) {
    console.error('ingest-event error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

export default router;
