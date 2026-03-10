alter table public.tenants
  add column if not exists type text not null default 'empresa_ti';

alter table public.tenants
  add column if not exists subdomain text;

alter table public.tenants
  add column if not exists portal_slug text;

update public.tenants
set portal_slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        translate(name, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      ),
      '(^-|-$)',
      '',
      'g'
    ),
    '-+',
    '-',
    'g'
  )
)
where coalesce(nullif(portal_slug, ''), nullif(subdomain, '')) is null;

update public.tenants
set portal_slug = subdomain
where coalesce(nullif(portal_slug, ''), '') = ''
  and coalesce(nullif(subdomain, ''), '') <> '';

create unique index if not exists idx_tenants_portal_slug
  on public.tenants (portal_slug)
  where portal_slug is not null;

create table if not exists public.official_sessions (
  session_guid text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  device_fk uuid references public.tenant_devices(id) on delete set null,
  speaker_name text not null,
  started_at_utc timestamptz not null,
  ended_at_utc timestamptz null,
  planned_seconds integer not null default 0,
  elapsed_seconds integer not null default 0,
  final_status text not null default 'FINISHED',
  created_by text null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_official_sessions_tenant_started
  on public.official_sessions (tenant_id, started_at_utc desc);

create index if not exists idx_official_sessions_tenant_speaker
  on public.official_sessions (tenant_id, speaker_name);

create table if not exists public.official_session_audit_logs (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_guid text not null references public.official_sessions(session_guid) on delete cascade,
  event_type text not null,
  event_at_utc timestamptz not null,
  remaining_seconds integer not null default 0,
  elapsed_seconds integer not null default 0,
  details text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_official_session_audit_logs_session_event
  on public.official_session_audit_logs (session_guid, event_at_utc asc);

create index if not exists idx_official_session_audit_logs_tenant_event
  on public.official_session_audit_logs (tenant_id, event_at_utc desc);
