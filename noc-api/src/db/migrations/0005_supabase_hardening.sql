comment on table public.tenant_infra_profiles is
  'Perfis de infraestrutura por tenant usados pelo painel administrativo do NOC';

comment on table public.official_sessions is
  'Sessões oficiais sincronizadas pelo agente para relatórios do portal do cliente';

comment on table public.official_session_audit_logs is
  'Trilha auditável dos eventos das sessões oficiais sincronizadas';

alter table public.tenant_infra_profiles enable row level security;
alter table public.official_sessions enable row level security;
alter table public.official_session_audit_logs enable row level security;

drop policy if exists "deny tenant_infra_profiles public access"
  on public.tenant_infra_profiles;

create policy "deny tenant_infra_profiles public access"
  on public.tenant_infra_profiles
  as permissive
  for all
  to public
  using (false)
  with check (false);

drop policy if exists "deny official_sessions public access"
  on public.official_sessions;

create policy "deny official_sessions public access"
  on public.official_sessions
  as permissive
  for all
  to public
  using (false)
  with check (false);

drop policy if exists "deny official_session_audit_logs public access"
  on public.official_session_audit_logs;

create policy "deny official_session_audit_logs public access"
  on public.official_session_audit_logs
  as permissive
  for all
  to public
  using (false)
  with check (false);

update public.device_api_tokens
set revoked_at = expires_at
where revoked_at is null
  and expires_at <= now();
