create table if not exists public.ayet_studios_provider_config (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique default 'ayet_studios',
  integration_type text not null default 'offerwall_surveywall',
  environment text not null default 'production' check (environment = 'production'),
  adslot_id text,
  enabled boolean not null default false,
  last_test_at timestamptz,
  last_test_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ayet_studios_provider_config enable row level security;

create extension if not exists supabase_vault with schema vault;

create or replace function public.save_ayet_studios_api_key(p_api_key text)
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
   where name = 'taskora_ayet_studios_api_key'
   limit 1;

  if existing_id is null then
    perform vault.create_secret(
      btrim(p_api_key),
      'taskora_ayet_studios_api_key',
      'ayeT-Studios publisher API Key used by TASKORA'
    );
  else
    perform vault.update_secret(
      existing_id,
      btrim(p_api_key),
      'taskora_ayet_studios_api_key',
      'ayeT-Studios publisher API Key used by TASKORA'
    );
  end if;

  return true;
end;
$$;

create or replace function public.get_ayet_studios_api_key()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
    from vault.decrypted_secrets
   where name = 'taskora_ayet_studios_api_key'
   limit 1;
$$;

revoke all on function public.save_ayet_studios_api_key(text) from public, anon, authenticated;
revoke all on function public.get_ayet_studios_api_key() from public, anon, authenticated;
grant execute on function public.save_ayet_studios_api_key(text) to service_role;
grant execute on function public.get_ayet_studios_api_key() to service_role;
