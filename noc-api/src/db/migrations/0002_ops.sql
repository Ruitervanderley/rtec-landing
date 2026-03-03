-- OPS panel tables (devices, tokens, heartbeats, backups, alerts)

CREATE TABLE IF NOT EXISTS "tenant_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "device_id" text NOT NULL UNIQUE,
  "device_name" text,
  "app_version" text,
  "last_seen_at" timestamptz,
  "last_status" text,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_tenant_devices_tenant_last_seen"
ON "tenant_devices" ("tenant_id", "last_seen_at" DESC);

CREATE TABLE IF NOT EXISTS "device_api_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "device_fk" uuid NOT NULL REFERENCES "tenant_devices"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "device_heartbeats" (
  "id" bigserial PRIMARY KEY,
  "device_fk" uuid NOT NULL REFERENCES "tenant_devices"("id") ON DELETE CASCADE,
  "heartbeat_at" timestamptz NOT NULL DEFAULT now(),
  "status" text NOT NULL,
  "session_guid" text,
  "app_version" text,
  "meta" jsonb
);

CREATE INDEX IF NOT EXISTS "idx_device_heartbeats_device_at"
ON "device_heartbeats" ("device_fk", "heartbeat_at" DESC);

CREATE TABLE IF NOT EXISTS "device_backups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "device_fk" uuid NOT NULL REFERENCES "tenant_devices"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL,
  "backup_type" text NOT NULL,
  "session_guid" text,
  "object_key" text NOT NULL,
  "file_name" text NOT NULL,
  "size_bytes" bigint,
  "sha256" text,
  "status" text NOT NULL DEFAULT 'PENDING',
  "error_message" text,
  "retry_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "idx_device_backups_tenant_created_status"
ON "device_backups" ("tenant_id", "created_at" DESC, "status");

CREATE TABLE IF NOT EXISTS "ops_alerts" (
  "id" bigserial PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "device_fk" uuid REFERENCES "tenant_devices"("id") ON DELETE SET NULL,
  "alert_type" text NOT NULL,
  "payload" jsonb,
  "dedup_key" text NOT NULL,
  "sent_at" timestamptz,
  "delivered" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ops_alerts_dedup_sent"
ON "ops_alerts" ("dedup_key", "sent_at" DESC);
