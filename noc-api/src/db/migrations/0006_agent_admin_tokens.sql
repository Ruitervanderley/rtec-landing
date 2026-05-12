alter table public.tenant_devices
  alter column user_id drop not null;

comment on column public.tenant_devices.user_id is
  'Usuário responsável pelo provisionamento quando houver. Tokens administrativos do NOC podem deixar este campo vazio.';
