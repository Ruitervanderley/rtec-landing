create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  device_fk uuid not null references public.tenant_devices(id) on delete cascade,
  command_type text not null,
  status text not null default 'PENDING',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  requested_by text,
  requested_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  constraint device_commands_type_check check (
    command_type in ('FORCE_HEARTBEAT', 'APPLY_DESKTOP_INFO', 'COLLECT_DIAGNOSTIC')
  ),
  constraint device_commands_status_check check (
    status in ('PENDING', 'CLAIMED', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELED')
  )
);

create index if not exists idx_device_commands_device_status_requested
  on public.device_commands(device_fk, status, requested_at desc);

create index if not exists idx_device_commands_tenant_requested
  on public.device_commands(tenant_id, requested_at desc);

alter table public.device_commands enable row level security;
