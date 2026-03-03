-- NOC API initial schema
CREATE TYPE "public"."device_type" AS ENUM('router', 'camera', 'switch', 'server');
CREATE TYPE "public"."event_type" AS ENUM('ping_fail', 'high_latency', 'packet_loss', 'offline', 'temp_high');
CREATE TYPE "public"."incident_severity" AS ENUM('info', 'warning', 'critical');
CREATE TYPE "public"."incident_status" AS ENUM('open', 'investigating', 'resolved');

CREATE TABLE IF NOT EXISTS "devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "tipo" "device_type" NOT NULL,
  "local" text NOT NULL,
  "ip" text NOT NULL,
  "cliente_id" text
);

CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "device_id" uuid NOT NULL,
  "tipo" "event_type" NOT NULL,
  "valor" real,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "events" ADD CONSTRAINT "events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE IF NOT EXISTS "incidents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text NOT NULL,
  "severidade" "incident_severity" NOT NULL,
  "status" "incident_status" DEFAULT 'open' NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "causa_provavel" text,
  "impacto_cliente" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "incident_devices" (
  "incident_id" uuid NOT NULL,
  "device_id" uuid NOT NULL,
  PRIMARY KEY ("incident_id", "device_id")
);

ALTER TABLE "incident_devices" ADD CONSTRAINT "incident_devices_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "incident_devices" ADD CONSTRAINT "incident_devices_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
