create table if not exists public.offerwall_ad_conversions (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'offerwall_ad',
  transaction_id text not null,
  user_id uuid,
  task_id text,
  reward numeric(18, 8),
  currency text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'held', 'reversed', 'rejected')),
  occurred_at timestamptz,
  reversed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, transaction_id)
);

create index if not exists offerwall_ad_conversions_user_id_idx
  on public.offerwall_ad_conversions (user_id);

create index if not exists offerwall_ad_conversions_status_idx
  on public.offerwall_ad_conversions (status);

create table if not exists public.offerwall_ad_integration_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  status text not null,
  http_status integer,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists offerwall_ad_integration_logs_created_at_idx
  on public.offerwall_ad_integration_logs (created_at desc);

create table if not exists public.offerwall_ad_provider_config (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique default 'offerwall_ad',
  environment text not null default 'production' check (environment = 'production'),
  endpoint text,
  enabled boolean not null default false,
  last_test_at timestamptz,
  last_test_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.offerwall_ad_conversions enable row level security;
alter table public.offerwall_ad_integration_logs enable row level security;
alter table public.offerwall_ad_provider_config enable row level security;


-- Secure storage for the Offerwall Ad credential.
-- The API key is stored encrypted by Supabase Vault and is never exposed
-- through the public provider configuration table.
create extension if not exists supabase_vault with schema vault;

create or replace function public.save_offerwall_ad_api_key(p_api_key text)
returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_id uuid;
begin
  if p_api_key is null or btrim(p_api_key) = '' then
    raise exception 'API Key vazia';
  end if;

  select id
    into existing_id
    from vault.secrets
   where name = 'taskora_offerwall_ad_api_key'
   limit 1;

  if existing_id is null then
    perform vault.create_secret(
      btrim(p_api_key),
      'taskora_offerwall_ad_api_key',
      'Offerwall Ad production API Key used by TASKORA'
    );
  else
    perform vault.update_secret(
      existing_id,
      btrim(p_api_key),
      'taskora_offerwall_ad_api_key',
      'Offerwall Ad production API Key used by TASKORA'
    );
  end if;

  return true;
end;
$$;

create or replace function public.get_offerwall_ad_api_key()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
    from vault.decrypted_secrets
   where name = 'taskora_offerwall_ad_api_key'
   limit 1;
$$;

revoke all on function public.save_offerwall_ad_api_key(text) from public, anon, authenticated;
revoke all on function public.get_offerwall_ad_api_key() from public, anon, authenticated;
grant execute on function public.save_offerwall_ad_api_key(text) to service_role;
grant execute on function public.get_offerwall_ad_api_key() to service_role;
