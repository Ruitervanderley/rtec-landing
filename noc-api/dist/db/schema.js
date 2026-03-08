import { relations } from 'drizzle-orm';
import { bigint, boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, real, serial, text, timestamp, uuid, } from 'drizzle-orm/pg-core';
export const deviceTypeEnum = pgEnum('device_type', [
    'router',
    'camera',
    'switch',
    'server',
]);
export const eventTypeEnum = pgEnum('event_type', [
    'ping_fail',
    'high_latency',
    'packet_loss',
    'offline',
    'temp_high',
]);
export const severityEnum = pgEnum('incident_severity', [
    'info',
    'warning',
    'critical',
]);
export const incidentStatusEnum = pgEnum('incident_status', [
    'open',
    'investigating',
    'resolved',
]);
export const serviceCriticidadeEnum = pgEnum('service_criticidade', [
    'baixa',
    'media',
    'alta',
    'critica',
]);
// --- Operacional: Site → Area → Device; Service ←→ Device ---
export const sites = pgTable('sites', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    cliente: text('cliente').notNull(),
});
export const areas = pgTable('areas', {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id')
        .notNull()
        .references(() => sites.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
});
export const services = pgTable('services', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    criticidade: serviceCriticidadeEnum('criticidade').notNull(),
});
export const devices = pgTable('devices', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    tipo: deviceTypeEnum('tipo').notNull(),
    local: text('local').notNull(),
    ip: text('ip').notNull(),
    clienteId: text('cliente_id'),
    areaId: uuid('area_id').references(() => areas.id, { onDelete: 'set null' }),
});
export const serviceDevices = pgTable('service_devices', {
    serviceId: uuid('service_id')
        .notNull()
        .references(() => services.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id')
        .notNull()
        .references(() => devices.id, { onDelete: 'cascade' }),
}, t => [primaryKey({ columns: [t.serviceId, t.deviceId] })]);
export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: uuid('device_id')
        .notNull()
        .references(() => devices.id, { onDelete: 'cascade' }),
    tipo: eventTypeEnum('tipo').notNull(),
    valor: real('valor'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});
export const incidents = pgTable('incidents', {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    descricao: text('descricao').notNull(),
    severidade: severityEnum('severidade').notNull(),
    status: incidentStatusEnum('status').notNull().default('open'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    causaProvavel: text('causa_provavel'),
    impactoCliente: text('impacto_cliente'),
    impactoOperacional: text('impacto_operacional'),
    usuarioAfetado: text('usuario_afetado'),
    acaoRecomendada: text('acao_recomendada'),
    confiancaDiagnostico: real('confianca_diagnostico'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const incidentDevices = pgTable('incident_devices', {
    incidentId: uuid('incident_id')
        .notNull()
        .references(() => incidents.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id')
        .notNull()
        .references(() => devices.id, { onDelete: 'cascade' }),
}, t => [primaryKey({ columns: [t.incidentId, t.deviceId] })]);
export const tenantDevices = pgTable('tenant_devices', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    deviceId: text('device_id').notNull().unique(),
    deviceName: text('device_name'),
    appVersion: text('app_version'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    lastStatus: text('last_status'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
    index('idx_tenant_devices_tenant_last_seen').on(t.tenantId, t.lastSeenAt),
]);
export const deviceApiTokens = pgTable('device_api_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceFk: uuid('device_fk')
        .notNull()
        .references(() => tenantDevices.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const deviceHeartbeats = pgTable('device_heartbeats', {
    id: serial('id').primaryKey(),
    deviceFk: uuid('device_fk')
        .notNull()
        .references(() => tenantDevices.id, { onDelete: 'cascade' }),
    heartbeatAt: timestamp('heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull(),
    sessionGuid: text('session_guid'),
    appVersion: text('app_version'),
    meta: jsonb('meta').$type(),
}, t => [
    index('idx_device_heartbeats_device_at').on(t.deviceFk, t.heartbeatAt),
]);
export const deviceBackups = pgTable('device_backups', {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceFk: uuid('device_fk')
        .notNull()
        .references(() => tenantDevices.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    backupType: text('backup_type').notNull(),
    sessionGuid: text('session_guid'),
    objectKey: text('object_key').notNull(),
    fileName: text('file_name').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    sha256: text('sha256'),
    status: text('status').notNull().default('PENDING'),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
}, t => [
    index('idx_device_backups_tenant_created_status').on(t.tenantId, t.createdAt, t.status),
]);
export const opsAlerts = pgTable('ops_alerts', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    deviceFk: uuid('device_fk').references(() => tenantDevices.id, { onDelete: 'set null' }),
    alertType: text('alert_type').notNull(),
    payload: jsonb('payload').$type(),
    dedupKey: text('dedup_key').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    delivered: boolean('delivered').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
    index('idx_ops_alerts_dedup_sent').on(t.dedupKey, t.sentAt),
]);
export const tenantInfraProfiles = pgTable('tenant_infra_profiles', {
    tenantId: uuid('tenant_id').primaryKey(),
    profile: jsonb('profile').$type().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// Relations
export const sitesRelations = relations(sites, ({ many }) => ({
    areas: many(areas),
}));
export const areasRelations = relations(areas, ({ one, many }) => ({
    site: one(sites),
    devices: many(devices),
}));
export const servicesRelations = relations(services, ({ many }) => ({
    serviceDevices: many(serviceDevices),
}));
export const devicesRelations = relations(devices, ({ one, many }) => ({
    area: one(areas),
    events: many(events),
    incidentDevices: many(incidentDevices),
    serviceDevices: many(serviceDevices),
}));
export const serviceDevicesRelations = relations(serviceDevices, ({ one }) => ({
    service: one(services),
    device: one(devices),
}));
export const eventsRelations = relations(events, ({ one }) => ({
    device: one(devices),
}));
export const incidentsRelations = relations(incidents, ({ many }) => ({
    incidentDevices: many(incidentDevices),
}));
export const incidentDevicesRelations = relations(incidentDevices, ({ one }) => ({
    incident: one(incidents),
    device: one(devices),
}));
export const tenantDevicesRelations = relations(tenantDevices, ({ many }) => ({
    tokens: many(deviceApiTokens),
    heartbeats: many(deviceHeartbeats),
    backups: many(deviceBackups),
}));
export const deviceApiTokensRelations = relations(deviceApiTokens, ({ one }) => ({
    device: one(tenantDevices, {
        fields: [deviceApiTokens.deviceFk],
        references: [tenantDevices.id],
    }),
}));
export const deviceHeartbeatsRelations = relations(deviceHeartbeats, ({ one }) => ({
    device: one(tenantDevices, {
        fields: [deviceHeartbeats.deviceFk],
        references: [tenantDevices.id],
    }),
}));
export const deviceBackupsRelations = relations(deviceBackups, ({ one }) => ({
    device: one(tenantDevices, {
        fields: [deviceBackups.deviceFk],
        references: [tenantDevices.id],
    }),
}));
export const tenantInfraProfilesRelations = relations(tenantInfraProfiles, () => ({}));
//# sourceMappingURL=schema.js.map