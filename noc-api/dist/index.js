import express from 'express';
import { OpsAlertService } from './ops/alerts.js';
import { loadOpsConfig } from './ops/config.js';
import { OpsJobRunner } from './ops/jobs.js';
import { R2Service } from './ops/r2Service.js';
import devicesRoutes from './routes/devices.js';
import devicesCreateRoutes from './routes/devicesCreate.js';
import incidentsRoutes from './routes/incidents.js';
import ingestRoutes from './routes/ingest.js';
import { createOpsV1Router, getOpsHealth } from './routes/opsV1.js';
import { createPortalV1Router } from './routes/portalV1.js';
import servicesRoutes from './routes/services.js';
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const opsConfig = loadOpsConfig();
const opsR2Service = new R2Service(opsConfig);
const opsAlertService = new OpsAlertService(opsConfig);
const opsJobRunner = new OpsJobRunner({
    r2Service: opsR2Service,
    alertService: opsAlertService,
});
app.use(express.json());
app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (process.env.CORS_ORIGIN) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    next();
});
app.options('*', (_req, res) => res.sendStatus(204));
app.get('/health', (_req, res) => {
    void (async () => {
        const ops = await getOpsHealth({
            config: opsConfig,
            r2Service: opsR2Service,
            jobRunner: opsJobRunner,
        });
        res.json({
            status: 'ok',
            ops,
        });
    })();
});
app.use('/ingest-event', ingestRoutes);
app.use('/incidents', incidentsRoutes);
app.use('/devices', devicesCreateRoutes);
app.use('/devices', devicesRoutes);
app.use('/services', servicesRoutes);
app.use('/v1/portal', createPortalV1Router(opsConfig));
app.use('/v1', createOpsV1Router({
    config: opsConfig,
    r2Service: opsR2Service,
    alertService: opsAlertService,
    jobRunner: opsJobRunner,
}));
app.listen(PORT, () => {
    opsJobRunner.start();
    console.warn(`NOC API listening on http://localhost:${PORT}`);
    console.warn('  POST /ingest-event  - ingest event from monitor agent');
    console.warn('  GET  /incidents      - list incidents');
    console.warn('  GET  /devices/:id/status - device status');
    console.warn('  GET  /services - list services');
    console.warn('  POST /services - create service');
    console.warn('  GET  /services/:id - service detail + devices + incidents');
    console.warn('  POST /services/:id/devices - add device to service');
    console.warn('  POST /v1/device/provision - issue device token');
    console.warn('  POST /v1/device/heartbeat - operational heartbeat');
    console.warn('  POST /v1/backups/request-upload - request R2 signed url');
    console.warn('  POST /v1/backups/complete - mark backup upload result');
    console.warn('  GET  /v1/admin/* - operational admin endpoints');
    console.warn('  GET  /v1/portal/* - customer portal endpoints');
});
//# sourceMappingURL=index.js.map