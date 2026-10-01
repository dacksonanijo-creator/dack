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

alter table public.offerwall_ad_conversions enable row level security;
alter table public.offerwall_ad_integration_logs enable row level security;
