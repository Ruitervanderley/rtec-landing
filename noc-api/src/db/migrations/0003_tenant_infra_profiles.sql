CREATE TABLE IF NOT EXISTS "tenant_infra_profiles" (
  "tenant_id" uuid PRIMARY KEY,
  "profile" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
