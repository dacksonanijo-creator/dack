-- TASKORA FINANCE: immutable ledger and task-value distribution
-- No fictitious balances or financial transactions are inserted by this migration.

create table if not exists public.financial_distribution_rules (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  taskora_percent numeric(5,2) not null check (taskora_percent >= 0 and taskora_percent <= 100),
  user_percent numeric(5,2) not null check (user_percent >= 0 and user_percent <= 100),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  reason text,
  created_at timestamptz not null default now(),
  check (taskora_percent + user_percent = 100),
  check (effective_to is null or effective_to > effective_from)
);

create unique index if not exists financial_distribution_one_active
  on public.financial_distribution_rules(active)
  where active = true;

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  account_key text not null,
  account_type text not null check (account_type in (
    'provider_receivable',
    'platform_cash',
    'platform_pending_revenue',
    'platform_revenue',
    'user_pending_liability',
    'user_available_liability',
    'user_reserved_liability'
  )),
  user_id uuid references auth.users(id) on delete cascade,
  currency text not null default 'MZN',
  created_at timestamptz not null default now(),
  unique (account_key, currency)
);

create table if not exists public.financial_journal_entries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  entry_type text not null,
  status text not null default 'POSTED' check (status in ('PENDING','POSTED','REVERSED','CANCELLED')),
  currency text not null,
  description text,
  source_type text,
  source_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.financial_ledger_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.financial_journal_entries(id) on delete restrict,
  account_id uuid not null references public.financial_accounts(id) on delete restrict,
  direction text not null check (direction in ('DEBIT','CREDIT')),
  amount numeric(20,2) not null check (amount > 0),
  currency text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_task_conversions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  conversion_id text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null,
  provider_transaction_id text,
  transaction_id text,
  idempotency_key text not null unique,
  gross_amount numeric(20,2) not null check (gross_amount >= 0),
  provider_fees numeric(20,2) not null default 0 check (provider_fees >= 0),
  adjustments numeric(20,2) not null default 0,
  reversals numeric(20,2) not null default 0 check (reversals >= 0),
  net_amount numeric(20,2) not null check (net_amount >= 0),
  distributable_amount numeric(20,2) not null check (distributable_amount >= 0),
  taskora_percent numeric(5,2) not null check (taskora_percent >= 0 and taskora_percent <= 100),
  user_percent numeric(5,2) not null check (user_percent >= 0 and user_percent <= 100),
  taskora_amount numeric(20,2) not null check (taskora_amount >= 0),
  user_amount numeric(20,2) not null check (user_amount >= 0),
  currency text not null,
  status text not null default 'PENDING' check (status in (
    'PENDING','CONFIRMED','AVAILABLE','RESERVED','PAID','FAILED','REVERSED','CANCELLED'
  )),
  distribution_rule_id uuid not null references public.financial_distribution_rules(id),
  original_journal_entry_id uuid references public.financial_journal_entries(id),
  reversal_journal_entry_id uuid references public.financial_journal_entries(id),
  confirmed_at timestamptz,
  available_at timestamptz,
  reversed_at timestamptz,
  reversal_reason text,
  original_currency text,
  original_amount numeric(20,2),
  exchange_rate numeric(30,12),
  converted_amount numeric(20,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (net_amount = round(gross_amount - provider_fees + adjustments - reversals, 2)),
  check (distributable_amount <= net_amount),
  check (taskora_amount + user_amount = distributable_amount),
  check (taskora_percent + user_percent = 100),
  check (
    (original_amount is null and original_currency is null and exchange_rate is null and converted_amount is null)
    or
    (original_amount is not null and original_currency is not null and exchange_rate is not null and converted_amount is not null)
  )
);

create unique index if not exists financial_task_conversion_provider_tx
  on public.financial_task_conversions(provider, provider_transaction_id)
  where provider_transaction_id is not null;

create index if not exists financial_task_conversions_user_date
  on public.financial_task_conversions(user_id, created_at desc);

create index if not exists financial_task_conversions_status_date
  on public.financial_task_conversions(status, created_at desc);

create index if not exists financial_ledger_lines_account_date
  on public.financial_ledger_lines(account_id, created_at desc);

create index if not exists financial_journal_entries_source
  on public.financial_journal_entries(source_type, source_id);

create table if not exists public.financial_reconciliation_flags (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  reference_id text,
  currency text not null,
  ledger_amount numeric(20,2) not null,
  external_amount numeric(20,2),
  difference numeric(20,2) not null,
  status text not null default 'OPEN' check (status in ('OPEN','INVESTIGATING','RESOLVED')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

alter table public.financial_distribution_rules enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.financial_journal_entries enable row level security;
alter table public.financial_ledger_lines enable row level security;
alter table public.financial_task_conversions enable row level security;
alter table public.financial_reconciliation_flags enable row level security;

revoke all on public.financial_distribution_rules,
  public.financial_accounts,
  public.financial_journal_entries,
  public.financial_ledger_lines,
  public.financial_task_conversions,
  public.financial_reconciliation_flags
from anon, authenticated;

grant select on public.financial_distribution_rules to authenticated;
grant select on public.financial_task_conversions to authenticated;
grant select on public.financial_ledger_lines to authenticated;
grant select on public.financial_journal_entries to authenticated;
grant select on public.financial_accounts to authenticated;

create policy financial_rules_admin on public.financial_distribution_rules
for all to authenticated
using (public.is_taskora_admin())
with check (public.is_taskora_admin());

create policy financial_accounts_owner_or_admin on public.financial_accounts
for select to authenticated
using (public.is_taskora_admin() or user_id = auth.uid());

create policy financial_journal_owner_or_admin on public.financial_journal_entries
for select to authenticated
using (
  public.is_taskora_admin()
  or exists (
    select 1
    from public.financial_ledger_lines l
    join public.financial_accounts a on a.id = l.account_id
    where l.journal_entry_id = financial_journal_entries.id
      and a.user_id = auth.uid()
  )
);

create policy financial_ledger_owner_or_admin on public.financial_ledger_lines
for select to authenticated
using (
  public.is_taskora_admin()
  or exists (
    select 1
    from public.financial_accounts a
    where a.id = financial_ledger_lines.account_id
      and a.user_id = auth.uid()
  )
);

create policy financial_conversions_owner_or_admin on public.financial_task_conversions
for select to authenticated
using (public.is_taskora_admin() or user_id = auth.uid());

create policy financial_reconciliation_admin on public.financial_reconciliation_flags
for all to authenticated
using (public.is_taskora_admin())
with check (public.is_taskora_admin());

create or replace function public.financial_ensure_account(
  p_account_key text,
  p_account_type text,
  p_user_id uuid,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.financial_accounts
  where account_key = p_account_key and currency = p_currency
  limit 1;

  if v_id is null then
    insert into public.financial_accounts(account_key, account_type, user_id, currency)
    values (p_account_key, p_account_type, p_user_id, p_currency)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.financial_ensure_account(text,text,uuid,text) from public, anon, authenticated;

create or replace function public.get_taskora_distribution_rule()
returns table(
  id uuid,
  version integer,
  taskora_percent numeric,
  user_percent numeric,
  effective_from timestamptz,
  reason text
)
language sql
stable
security invoker
as $$
  select id, version, taskora_percent, user_percent, effective_from, reason
  from public.financial_distribution_rules
  where active = true
  order by version desc
  limit 1
$$;

grant execute on function public.get_taskora_distribution_rule() to authenticated;

create or replace function public.set_taskora_distribution_percent(
  p_taskora_percent numeric,
  p_reason text default null
)
returns public.financial_distribution_rules
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous public.financial_distribution_rules%rowtype;
  v_new public.financial_distribution_rules%rowtype;
  v_version integer;
begin
  if not public.is_taskora_admin() then
    raise exception 'not authorized';
  end if;

  if p_taskora_percent is null
     or p_taskora_percent < 0
     or p_taskora_percent > 100
     or p_taskora_percent <> round(p_taskora_percent, 2) then
    raise exception 'invalid TASKORA percentage';
  end if;

  select * into v_previous
  from public.financial_distribution_rules
  where active = true
  order by version desc
  limit 1
  for update;

  select coalesce(max(version), 0) + 1 into v_version
  from public.financial_distribution_rules;

  update public.financial_distribution_rules
  set active = false, effective_to = now()
  where active = true;

  insert into public.financial_distribution_rules(
    version, taskora_percent, user_percent, effective_from, active, created_by, reason
  )
  values (
    v_version, p_taskora_percent, 100 - p_taskora_percent, now(), true, auth.uid(), nullif(btrim(p_reason), '')
  )
  returning * into v_new;

  perform public.write_security_audit(
    'financial_distribution_rule_changed',
    'finance',
    'financial_distribution_rules',
    v_new.id::text,
    'success',
    jsonb_build_object(
      'previous_percent', coalesce(v_previous.taskora_percent, null),
      'new_percent', v_new.taskora_percent,
      'previous_version', coalesce(v_previous.version, null),
      'new_version', v_new.version,
      'reason', v_new.reason
    )
  );

  return v_new;
end;
$$;

revoke all on function public.set_taskora_distribution_percent(numeric,text) from public, anon;
grant execute on function public.set_taskora_distribution_percent(numeric,text) to authenticated;

create or replace function public.get_my_financial_wallet()
returns table(
  currency text,
  available numeric,
  pending numeric,
  reserved numeric,
  total_earned numeric
)
language sql
stable
security invoker
as $$
  select
    coalesce((select currency from public.financial_accounts where user_id = auth.uid() limit 1), 'MZN'),
    coalesce(sum(case when a.account_type = 'user_available_liability' and l.direction = 'CREDIT' then l.amount
                      when a.account_type = 'user_available_liability' and l.direction = 'DEBIT' then -l.amount else 0 end), 0),
    coalesce(sum(case when a.account_type = 'user_pending_liability' and l.direction = 'CREDIT' then l.amount
                      when a.account_type = 'user_pending_liability' and l.direction = 'DEBIT' then -l.amount else 0 end), 0),
    coalesce(sum(case when a.account_type = 'user_reserved_liability' and l.direction = 'CREDIT' then l.amount
                      when a.account_type = 'user_reserved_liability' and l.direction = 'DEBIT' then -l.amount else 0 end), 0),
    coalesce(sum(case when a.account_type in ('user_pending_liability','user_available_liability','user_reserved_liability')
                      and l.direction = 'CREDIT' then l.amount
                      when a.account_type in ('user_pending_liability','user_available_liability','user_reserved_liability')
                      and l.direction = 'DEBIT' then -l.amount else 0 end), 0)
  from public.financial_ledger_lines l
  join public.financial_accounts a on a.id = l.account_id
  join public.financial_journal_entries j on j.id = l.journal_entry_id
  where a.user_id = auth.uid()
    and j.status in ('PENDING','POSTED','REVERSED')
$$;

grant execute on function public.get_my_financial_wallet() to authenticated;

create or replace function public.get_taskora_financial_wallet()
returns table(
  currency text,
  pending_revenue numeric,
  revenue numeric,
  user_obligations numeric,
  reserved_user_obligations numeric,
  paid_user_amount numeric,
  reversed_amount numeric
)
language sql
stable
security invoker
as $$
  select
    coalesce((select currency from public.financial_accounts where account_type='platform_revenue' limit 1), 'MZN'),
    coalesce(sum(case when a.account_type='platform_pending_revenue' and l.direction='CREDIT' then l.amount
                      when a.account_type='platform_pending_revenue' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='platform_revenue' and l.direction='CREDIT' then l.amount
                      when a.account_type='platform_revenue' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='user_available_liability' and l.direction='CREDIT' then l.amount
                      when a.account_type='user_available_liability' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='user_reserved_liability' and l.direction='CREDIT' then l.amount
                      when a.account_type='user_reserved_liability' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='user_reserved_liability' and l.direction='DEBIT' then l.amount else 0 end),0),
    coalesce(sum(case when j.entry_type='task_conversion_reversal' and l.direction='DEBIT' and a.account_type in ('user_pending_liability','user_available_liability','user_reserved_liability') then l.amount else 0 end),0)
  from public.financial_ledger_lines l
  join public.financial_accounts a on a.id = l.account_id
  join public.financial_journal_entries j on j.id = l.journal_entry_id
  where j.status in ('PENDING','POSTED','REVERSED')
    and a.account_type in ('platform_pending_revenue','platform_revenue','user_available_liability','user_reserved_liability')
$$;

grant execute on function public.get_taskora_financial_wallet() to authenticated;

create or replace function public.recognize_task_conversion(
  p_task_id uuid,
  p_conversion_id text,
  p_user_id uuid,
  p_provider text,
  p_provider_transaction_id text,
  p_transaction_id text,
  p_idempotency_key text,
  p_gross_amount numeric,
  p_provider_fees numeric default 0,
  p_adjustments numeric default 0,
  p_reversals numeric default 0,
  p_currency text default 'MZN',
  p_original_currency text default null,
  p_original_amount numeric default null,
  p_exchange_rate numeric default null,
  p_converted_amount numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.financial_task_conversions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule public.financial_distribution_rules%rowtype;
  v_conversion public.financial_task_conversions%rowtype;
  v_existing public.financial_task_conversions%rowtype;
  v_net numeric(20,2);
  v_user_amount numeric(20,2);
  v_taskora_amount numeric(20,2);
  v_provider_account uuid;
  v_pending_user_account uuid;
  v_pending_platform_account uuid;
  v_entry uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  if p_user_id is null or p_provider is null or btrim(p_provider) = '' then
    raise exception 'conversion identity is required';
  end if;
  if p_gross_amount is null or p_gross_amount < 0
     or p_provider_fees is null or p_provider_fees < 0
     or p_reversals is null or p_reversals < 0 then
    raise exception 'invalid financial amount';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select * into v_existing
  from public.financial_task_conversions
  where idempotency_key = p_idempotency_key
     or (p_provider_transaction_id is not null
         and provider = p_provider
         and provider_transaction_id = p_provider_transaction_id)
  limit 1;

  if v_existing.id is not null then
    return v_existing;
  end if;

  select * into v_rule
  from public.financial_distribution_rules
  where active = true
  order by version desc
  limit 1
  for update;

  if v_rule.id is null then
    raise exception 'distribution rule not configured';
  end if;

  v_net := round(p_gross_amount - p_provider_fees + p_adjustments - p_reversals, 2);
  if v_net < 0 then
    raise exception 'net amount cannot be negative';
  end if;

  v_user_amount := round(v_net * v_rule.user_percent / 100, 2);
  v_taskora_amount := round(v_net - v_user_amount, 2);

  if v_user_amount + v_taskora_amount <> v_net then
    raise exception 'distribution rounding mismatch';
  end if;

  insert into public.financial_task_conversions(
    task_id, conversion_id, user_id, provider, provider_transaction_id, transaction_id,
    idempotency_key, gross_amount, provider_fees, adjustments, reversals, net_amount,
    distributable_amount, taskora_percent, user_percent, taskora_amount, user_amount,
    currency, status, distribution_rule_id, original_currency, original_amount,
    exchange_rate, converted_amount, metadata
  )
  values(
    p_task_id, p_conversion_id, p_user_id, p_provider, p_provider_transaction_id, p_transaction_id,
    p_idempotency_key, round(p_gross_amount,2), round(p_provider_fees,2), round(p_adjustments,2),
    round(p_reversals,2), v_net, v_net, v_rule.taskora_percent, v_rule.user_percent,
    v_taskora_amount, v_user_amount, p_currency, 'PENDING', v_rule.id,
    p_original_currency, p_original_amount, p_exchange_rate, p_converted_amount, coalesce(p_metadata,'{}'::jsonb)
  )
  returning * into v_conversion;

  v_provider_account := public.financial_ensure_account(
    'provider_receivable:' || p_provider || ':' || p_currency,
    'provider_receivable', null, p_currency
  );
  v_pending_user_account := public.financial_ensure_account(
    'user_pending:' || p_user_id::text || ':' || p_currency,
    'user_pending_liability', p_user_id, p_currency
  );
  v_pending_platform_account := public.financial_ensure_account(
    'platform_pending_revenue:' || p_currency,
    'platform_pending_revenue', null, p_currency
  );

  insert into public.financial_journal_entries(
    reference, entry_type, status, currency, description, source_type, source_id, metadata
  )
  values(
    'conversion:' || p_conversion_id,
    'task_conversion', 'POSTED', p_currency,
    'Reconhecimento de conversão de tarefa em estado PENDING',
    'task_conversion', v_conversion.id::text,
    jsonb_build_object('distribution_rule_id',v_rule.id,'provider',p_provider)
  )
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_provider_account,'DEBIT',v_net,p_currency),
    (v_entry,v_pending_user_account,'CREDIT',v_user_amount,p_currency),
    (v_entry,v_pending_platform_account,'CREDIT',v_taskora_amount,p_currency);

  update public.financial_task_conversions
  set original_journal_entry_id=v_entry, updated_at=now()
  where id=v_conversion.id;

  return (select c from public.financial_task_conversions c where c.id=v_conversion.id);
end;
$$;

revoke all on function public.recognize_task_conversion(
  uuid,text,uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,text,numeric,numeric,numeric,jsonb
) from public, anon, authenticated;
grant execute on function public.recognize_task_conversion(
  uuid,text,uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,text,numeric,numeric,numeric,jsonb
) to service_role;

create or replace function public.make_task_conversion_available(p_conversion_id text)
returns public.financial_task_conversions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.financial_task_conversions%rowtype;
  v_pending_user uuid;
  v_available_user uuid;
  v_pending_platform uuid;
  v_revenue_platform uuid;
  v_entry uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;

  select * into v_c from public.financial_task_conversions where conversion_id=p_conversion_id for update;
  if v_c.id is null then raise exception 'conversion not found'; end if;
  if v_c.status in ('AVAILABLE','PAID') then return v_c; end if;
  if v_c.status <> 'PENDING' and v_c.status <> 'CONFIRMED' then
    raise exception 'conversion cannot become available from current state';
  end if;

  v_pending_user := public.financial_ensure_account('user_pending:'||v_c.user_id::text||':'||v_c.currency,'user_pending_liability',v_c.user_id,v_c.currency);
  v_available_user := public.financial_ensure_account('user_available:'||v_c.user_id::text||':'||v_c.currency,'user_available_liability',v_c.user_id,v_c.currency);
  v_pending_platform := public.financial_ensure_account('platform_pending_revenue:'||v_c.currency,'platform_pending_revenue',null,v_c.currency);
  v_revenue_platform := public.financial_ensure_account('platform_revenue:'||v_c.currency,'platform_revenue',null,v_c.currency);

  insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id)
  values('conversion-available:'||p_conversion_id,'task_conversion_available','POSTED',v_c.currency,'Passagem de PENDING para AVAILABLE','task_conversion',v_c.id::text)
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_pending_user,'DEBIT',v_c.user_amount,v_c.currency),
    (v_entry,v_available_user,'CREDIT',v_c.user_amount,v_c.currency),
    (v_entry,v_pending_platform,'DEBIT',v_c.taskora_amount,v_c.currency),
    (v_entry,v_revenue_platform,'CREDIT',v_c.taskora_amount,v_c.currency);

  update public.financial_task_conversions
  set status='AVAILABLE', confirmed_at=coalesce(confirmed_at,now()), available_at=now(), updated_at=now()
  where id=v_c.id
  returning * into v_c;

  return v_c;
end;
$$;

revoke all on function public.make_task_conversion_available(text) from public, anon, authenticated;
grant execute on function public.make_task_conversion_available(text) to service_role;

create or replace function public.reverse_task_conversion(
  p_conversion_id text,
  p_reason text
)
returns public.financial_task_conversions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.financial_task_conversions%rowtype;
  v_user_account uuid;
  v_platform_account uuid;
  v_provider_account uuid;
  v_entry uuid;
  v_user_type text;
  v_platform_type text;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'reversal reason is required'; end if;

  select * into v_c from public.financial_task_conversions where conversion_id=p_conversion_id for update;
  if v_c.id is null then raise exception 'conversion not found'; end if;
  if v_c.status='REVERSED' then return v_c; end if;
  if v_c.status in ('FAILED','CANCELLED') then raise exception 'conversion is not reversible'; end if;

  if v_c.status='PENDING' or v_c.status='CONFIRMED' then
    v_user_type := 'user_pending_liability';
    v_platform_type := 'platform_pending_revenue';
  else
    v_user_type := 'user_available_liability';
    v_platform_type := 'platform_revenue';
  end if;

  v_user_account := public.financial_ensure_account('user_'||case when v_user_type='user_pending_liability' then 'pending' else 'available' end||':'||v_c.user_id::text||':'||v_c.currency,v_user_type,v_c.user_id,v_c.currency);
  v_platform_account := public.financial_ensure_account('platform_'||case when v_platform_type='platform_pending_revenue' then 'pending_revenue' else 'revenue' end||':'||v_c.currency,v_platform_type,null,v_c.currency);
  v_provider_account := public.financial_ensure_account('provider_receivable:'||v_c.provider||':'||v_c.currency,'provider_receivable',null,v_c.currency);

  insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id,metadata)
  values(
    'conversion-reversal:'||p_conversion_id,'task_conversion_reversal','REVERSED',v_c.currency,
    'Reversão de conversão: '||p_reason,'task_conversion',v_c.id::text,
    jsonb_build_object('reason',p_reason,'original_conversion',p_conversion_id)
  )
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_user_account,'DEBIT',v_c.user_amount,v_c.currency),
    (v_entry,v_platform_account,'DEBIT',v_c.taskora_amount,v_c.currency),
    (v_entry,v_provider_account,'CREDIT',v_c.distributable_amount,v_c.currency);

  update public.financial_task_conversions
  set status='REVERSED', reversal_journal_entry_id=v_entry, reversed_at=now(), reversal_reason=p_reason, updated_at=now()
  where id=v_c.id
  returning * into v_c;

  return v_c;
end;
$$;

revoke all on function public.reverse_task_conversion(text,text) from public, anon, authenticated;
grant execute on function public.reverse_task_conversion(text,text) to service_role;

create or replace function public.get_taskora_financial_reconciliation()
returns table(
  currency text,
  user_liability numeric,
  platform_revenue numeric,
  pending_user_liability numeric,
  pending_platform_revenue numeric,
  open_flags bigint
)
language sql
stable
security invoker
as $$
  select
    coalesce((select currency from public.financial_accounts where user_id is not null limit 1), 'MZN'),
    coalesce(sum(case when a.account_type='user_available_liability' and l.direction='CREDIT' then l.amount
                      when a.account_type='user_available_liability' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='platform_revenue' and l.direction='CREDIT' then l.amount
                      when a.account_type='platform_revenue' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='user_pending_liability' and l.direction='CREDIT' then l.amount
                      when a.account_type='user_pending_liability' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='platform_pending_revenue' and l.direction='CREDIT' then l.amount
                      when a.account_type='platform_pending_revenue' and l.direction='DEBIT' then -l.amount else 0 end),0),
    (select count(*) from public.financial_reconciliation_flags where status <> 'RESOLVED')
  from public.financial_ledger_lines l
  join public.financial_accounts a on a.id=l.account_id
  join public.financial_journal_entries j on j.id=l.journal_entry_id
  where j.status in ('POSTED','REVERSED')
$$;

grant execute on function public.get_taskora_financial_reconciliation() to authenticated;

create or replace function public.update_financial_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists financial_task_conversions_updated on public.financial_task_conversions;
create trigger financial_task_conversions_updated
before update on public.financial_task_conversions
for each row execute function public.update_financial_updated_at();

-- Keep the legacy wallets readable for compatibility, but financial truth is the ledger.
