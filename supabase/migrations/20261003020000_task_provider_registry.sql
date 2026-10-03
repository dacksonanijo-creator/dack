create table if not exists public.task_provider_integrations (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  display_name text not null,
  integration_type text not null,
  environment text not null default 'production',
  config_route text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_provider_registry (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  display_name text not null,
  integration_type text not null,
  environment text not null default 'production',
  status text not null default 'not_configured'
    check (status in ('not_configured','connected','error','disabled')),
  enabled boolean not null default false,
  credentials_configured boolean not null default false,
  last_test_at timestamptz,
  registered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.task_provider_integrations enable row level security;
alter table public.task_provider_registry enable row level security;

revoke all on table public.task_provider_integrations from anon, authenticated;
revoke all on table public.task_provider_registry from anon, authenticated;
grant select on table public.task_provider_integrations to service_role;
grant select, insert, update on table public.task_provider_registry to service_role;

insert into public.task_provider_integrations
  (provider_key, display_name, integration_type, environment, config_route)
values
  ('offerwall_ad', 'Offerwall Ad', 'API de ofertas', 'production', 'offerwall-ad-test'),
  ('ayet_studios', 'ayeT-Studios', 'Offerwall / Surveywall API', 'production', 'ayet-studios-test')
on conflict (provider_key) do update set
  display_name = excluded.display_name,
  integration_type = excluded.integration_type,
  environment = excluded.environment,
  config_route = excluded.config_route,
  updated_at = now();
