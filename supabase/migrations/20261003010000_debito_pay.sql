create table if not exists public.debito_pay_provider_config (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique default 'debito_pay',
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  merchant_id text,
  wallet_code text,
  base_url text,
  webhook_url text,
  enabled boolean not null default false,
  status text not null default 'not_configured' check (
    status in ('not_configured', 'connected', 'authentication_error', 'communication_error', 'disabled')
  ),
  last_test_at timestamptz,
  last_communication_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debito_pay_webhook_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  event text,
  transaction_reference text,
  payment_id text,
  status text,
  amount numeric,
  currency text,
  event_at timestamptz,
  response jsonb,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.debito_pay_provider_config enable row level security;
alter table public.debito_pay_webhook_events enable row level security;

create extension if not exists supabase_vault with schema vault;

create or replace function public.save_debito_pay_secret(p_name text, p_secret text)
returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_id uuid;
begin
  if p_name not in (
    'taskora_debito_pay_api_key',
    'taskora_debito_pay_webhook_secret'
  ) then
    raise exception 'Nome de secret não permitido';
  end if;

  if p_secret is null or btrim(p_secret) = '' then
    raise exception 'Secret vazio';
  end if;

  select id into existing_id
  from vault.secrets
  where name = p_name
  limit 1;

  if existing_id is null then
    perform vault.create_secret(btrim(p_secret), p_name, 'TASKORA Debito Pay credential');
  else
    perform vault.update_secret(existing_id, btrim(p_secret), p_name, 'TASKORA Debito Pay credential');
  end if;

  return true;
end;
$$;

create or replace function public.get_debito_pay_secret(p_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = p_name
  limit 1;
$$;

revoke all on function public.save_debito_pay_secret(text, text) from public, anon, authenticated;
revoke all on function public.get_debito_pay_secret(text) from public, anon, authenticated;
grant execute on function public.save_debito_pay_secret(text, text) to service_role;
grant execute on function public.get_debito_pay_secret(text) to service_role;

create index if not exists debito_pay_webhook_events_received_at_idx
  on public.debito_pay_webhook_events (received_at desc);

create index if not exists debito_pay_webhook_events_payment_id_idx
  on public.debito_pay_webhook_events (payment_id);
