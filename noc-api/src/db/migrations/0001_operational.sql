-- NOC operacional: Site, Area, Service, ServiceDevice + Incident com impacto operacional

CREATE TYPE "public"."service_criticidade" AS ENUM('baixa', 'media', 'alta', 'critica');

CREATE TABLE IF NOT EXISTS "sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "cliente" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "areas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "site_id" uuid NOT NULL REFERENCES "public"."sites"("id") ON DELETE CASCADE,
  "nome" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "criticidade" "service_criticidade" NOT NULL
);

ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "area_id" uuid REFERENCES "public"."areas"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "service_devices" (
  "service_id" uuid NOT NULL REFERENCES "public"."services"("id") ON DELETE CASCADE,
  "device_id" uuid NOT NULL REFERENCES "public"."devices"("id") ON DELETE CASCADE,
  PRIMARY KEY ("service_id", "device_id")
);

ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "impacto_operacional" text;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "usuario_afetado" text;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "acao_recomendada" text;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "confianca_diagnostico" real;
