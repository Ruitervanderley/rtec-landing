import { eq, gte, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { areas, devices, events, serviceDevices, services, sites, } from '../db/schema.js';
const WINDOW_MINUTES = 5;
/**
 * Carrega eventos recentes e monta o contexto operacional (dispositivos, áreas, sites, serviços).
 * Única fonte de dados para as regras do motor.
 */
export async function buildDiagnosticContext() {
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const rows = await db
        .select({
        eventId: events.id,
        deviceId: events.deviceId,
        tipo: events.tipo,
        valor: events.valor,
        timestamp: events.timestamp,
        deviceNome: devices.nome,
        deviceTipo: devices.tipo,
        deviceLocal: devices.local,
        deviceAreaId: devices.areaId,
        areaNome: areas.nome,
        siteId: sites.id,
        siteNome: sites.nome,
        cliente: sites.cliente,
    })
        .from(events)
        .innerJoin(devices, eq(events.deviceId, devices.id))
        .leftJoin(areas, eq(devices.areaId, areas.id))
        .leftJoin(sites, eq(areas.siteId, sites.id))
        .where(gte(events.timestamp, windowStart))
        .orderBy(events.timestamp);
    if (rows.length === 0) {
        return null;
    }
    const deviceIds = [...new Set(rows.map(r => r.deviceId))];
    const serviceLinks = await db
        .select({
        deviceId: serviceDevices.deviceId,
        serviceId: services.id,
        serviceNome: services.nome,
    })
        .from(serviceDevices)
        .innerJoin(services, eq(serviceDevices.serviceId, services.id))
        .where(inArray(serviceDevices.deviceId, deviceIds));
    const deviceToServices = new Map();
    for (const s of serviceLinks) {
        const list = deviceToServices.get(s.deviceId) ?? [];
        list.push({ id: s.serviceId, nome: s.serviceNome });
        deviceToServices.set(s.deviceId, list);
    }
    const eventsWithMeta = rows.map((r) => {
        const svc = deviceToServices.get(r.deviceId) ?? [];
        return {
            id: r.eventId,
            deviceId: r.deviceId,
            tipo: r.tipo,
            valor: r.valor,
            timestamp: r.timestamp,
            device: {
                id: r.deviceId,
                nome: r.deviceNome,
                tipo: r.deviceTipo,
                local: r.deviceLocal,
                areaId: r.deviceAreaId,
                areaNome: r.areaNome,
                siteNome: r.siteNome,
                cliente: r.cliente,
            },
            serviceIds: svc.map(x => x.id),
            serviceNomes: svc.map(x => x.nome),
        };
    });
    const offlineTypes = new Set(['ping_fail', 'offline']);
    const offlineByService = new Map();
    const offlineByArea = new Map();
    const offlineDeviceIds = new Set();
    const deviceHasOffline = new Set();
    const deviceHasHighLatency = new Set();
    for (const e of eventsWithMeta) {
        if (offlineTypes.has(e.tipo)) {
            deviceHasOffline.add(e.deviceId);
            offlineDeviceIds.add(e.deviceId);
            for (const sid of e.serviceIds) {
                const cur = offlineByService.get(sid);
                const name = e.serviceNomes[0] ?? 'Serviço';
                if (!cur) {
                    offlineByService.set(sid, {
                        deviceIds: [e.deviceId],
                        serviceNome: name,
                    });
                }
                else if (!cur.deviceIds.includes(e.deviceId)) {
                    cur.deviceIds.push(e.deviceId);
                }
            }
            const areaKey = e.device.areaId ?? e.device.local;
            const curArea = offlineByArea.get(areaKey);
            if (curArea) {
                if (!curArea.deviceIds.includes(e.deviceId)) {
                    curArea.deviceIds.push(e.deviceId);
                }
            }
            else {
                offlineByArea.set(areaKey, {
                    deviceIds: [e.deviceId],
                    areaNome: e.device.areaNome ?? e.device.local,
                    siteNome: e.device.siteNome ?? '',
                });
            }
        }
        if (e.tipo === 'high_latency') {
            deviceHasHighLatency.add(e.deviceId);
        }
    }
    const highLatencyOnly = [];
    for (const e of eventsWithMeta) {
        if (e.tipo === 'high_latency' && !deviceHasOffline.has(e.deviceId)) {
            if (!highLatencyOnly.some(x => x.deviceId === e.deviceId)) {
                highLatencyOnly.push({
                    deviceId: e.deviceId,
                    deviceNome: e.device.nome,
                    serviceNomes: e.serviceNomes,
                });
            }
        }
    }
    const gatewayOfflineSites = [];
    const siteOfflineDevices = new Map();
    for (const e of eventsWithMeta) {
        if (!offlineTypes.has(e.tipo)) {
            continue;
        }
        const siteId = e.device.areaId ? `area-${e.device.areaId}` : e.device.local;
        const cur = siteOfflineDevices.get(siteId);
        if (!cur) {
            siteOfflineDevices.set(siteId, {
                siteNome: e.device.siteNome ?? e.device.local,
                deviceIds: new Set([e.deviceId]),
                hasGateway: e.device.tipo === 'router',
            });
        }
        else {
            cur.deviceIds.add(e.deviceId);
            if (e.device.tipo === 'router') {
                cur.hasGateway = true;
            }
        }
    }
    for (const [areaKey, off] of siteOfflineDevices) {
        if (!off.hasGateway || off.deviceIds.size === 0) {
            continue;
        }
        gatewayOfflineSites.push({
            siteId: areaKey,
            siteNome: off.siteNome,
            offlineDeviceIds: [...off.deviceIds],
            totalDevicesInSite: off.deviceIds.size,
        });
    }
    return {
        windowStart,
        events: eventsWithMeta,
        offlineByService,
        offlineByArea,
        highLatencyOnly,
        gatewayOfflineSites,
    };
}
//# sourceMappingURL=buildContext.js.map