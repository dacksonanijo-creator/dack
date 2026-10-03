-- TASKORA FINANCE: payout reservation layer and cash/revenue reporting

alter table public.financial_accounts
  drop constraint if exists financial_accounts_account_type_check;

alter table public.financial_accounts
  add constraint financial_accounts_account_type_check check (account_type in (
    'provider_receivable',
    'platform_cash',
    'platform_pending_revenue',
    'platform_revenue',
    'user_pending_liability',
    'user_available_liability',
    'user_reserved_liability'
  ));

create table if not exists public.financial_payout_reservations (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid references public.withdrawals(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(20,2) not null check (amount > 0),
  currency text not null,
  status text not null default 'RESERVED' check (status in ('RESERVED','PAID','FAILED','CANCELLED')),
  idempotency_key text not null unique,
  provider_transaction_id text,
  reserved_journal_entry_id uuid references public.financial_journal_entries(id),
  final_journal_entry_id uuid references public.financial_journal_entries(id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

alter table public.financial_payout_reservations enable row level security;
revoke all on public.financial_payout_reservations from anon, authenticated;
grant select on public.financial_payout_reservations to authenticated;

create policy financial_payout_reservations_owner_or_admin
on public.financial_payout_reservations for select to authenticated
using (public.is_taskora_admin() or user_id = auth.uid());

drop function if exists public.get_taskora_financial_wallet();

create or replace function public.get_taskora_financial_wallet()
returns table(
  currency text,
  operational_balance numeric,
  pending_revenue numeric,
  revenue numeric,
  user_available_obligations numeric,
  user_pending_obligations numeric,
  user_reserved_obligations numeric,
  paid_user_amount numeric,
  reversed_amount numeric
)
language sql
stable
security invoker
as $$
  select
    coalesce((select currency from public.financial_accounts where currency is not null order by created_at limit 1), 'MZN'),
    coalesce(sum(case when a.account_type='platform_cash' and l.direction='DEBIT' then l.amount
                      when a.account_type='platform_cash' and l.direction='CREDIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='platform_pending_revenue' and l.direction='CREDIT' then l.amount
                      when a.account_type='platform_pending_revenue' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='platform_revenue' and l.direction='CREDIT' then l.amount
                      when a.account_type='platform_revenue' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='user_available_liability' and l.direction='CREDIT' then l.amount
                      when a.account_type='user_available_liability' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='user_pending_liability' and l.direction='CREDIT' then l.amount
                      when a.account_type='user_pending_liability' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce(sum(case when a.account_type='user_reserved_liability' and l.direction='CREDIT' then l.amount
                      when a.account_type='user_reserved_liability' and l.direction='DEBIT' then -l.amount else 0 end),0),
    coalesce((select sum(amount) from public.financial_payout_reservations where status='PAID'),0),
    coalesce(sum(case when j.entry_type='task_conversion_reversal'
                       and l.direction='DEBIT'
                       and a.account_type in ('user_pending_liability','user_available_liability','user_reserved_liability')
                      then l.amount else 0 end),0)
  from public.financial_ledger_lines l
  join public.financial_accounts a on a.id=l.account_id
  join public.financial_journal_entries j on j.id=l.journal_entry_id
  where j.status in ('POSTED','REVERSED')
$$;

grant execute on function public.get_taskora_financial_wallet() to authenticated;

create or replace function public.reserve_user_funds(
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_idempotency_key text,
  p_withdrawal_id uuid default null
)
returns public.financial_payout_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.financial_payout_reservations%rowtype;
  v_available_account uuid;
  v_reserved_account uuid;
  v_entry uuid;
  v_balance numeric;
  v_row public.financial_payout_reservations%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid payout amount'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select * into v_existing from public.financial_payout_reservations
  where idempotency_key=p_idempotency_key limit 1;
  if v_existing.id is not null then return v_existing; end if;

  v_available_account := public.financial_ensure_account('user_available:'||p_user_id::text||':'||p_currency,'user_available_liability',p_user_id,p_currency);
  v_reserved_account := public.financial_ensure_account('user_reserved:'||p_user_id::text||':'||p_currency,'user_reserved_liability',p_user_id,p_currency);

  select coalesce(sum(case when l.direction='CREDIT' then l.amount else -l.amount end),0)
  into v_balance
  from public.financial_ledger_lines l
  join public.financial_journal_entries j on j.id=l.journal_entry_id
  where l.account_id=v_available_account and j.status in ('POSTED','REVERSED');

  if v_balance < p_amount then raise exception 'insufficient_ledger_balance'; end if;

  insert into public.financial_payout_reservations(withdrawal_id,user_id,amount,currency,idempotency_key)
  values(p_withdrawal_id,p_user_id,round(p_amount,2),p_currency,p_idempotency_key)
  returning * into v_row;

  insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id)
  values('payout-reserve:'||v_row.id,'payout_reservation','POSTED',p_currency,'Reserva de saldo para levantamento','payout',v_row.id::text)
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_available_account,'DEBIT',v_row.amount,p_currency),
    (v_entry,v_reserved_account,'CREDIT',v_row.amount,p_currency);

  update public.financial_payout_reservations
  set reserved_journal_entry_id=v_entry
  where id=v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.reserve_user_funds(uuid,numeric,text,text,uuid) from public, anon, authenticated;
grant execute on function public.reserve_user_funds(uuid,numeric,text,text,uuid) to service_role;

create or replace function public.finalize_user_payout(
  p_reservation_id uuid,
  p_success boolean,
  p_provider_transaction_id text default null
)
returns public.financial_payout_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.financial_payout_reservations%rowtype;
  v_reserved uuid;
  v_available uuid;
  v_cash uuid;
  v_entry uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;

  select * into v_r from public.financial_payout_reservations where id=p_reservation_id for update;
  if v_r.id is null then raise exception 'reservation not found'; end if;
  if v_r.status in ('PAID','FAILED','CANCELLED') then return v_r; end if;

  v_reserved := public.financial_ensure_account('user_reserved:'||v_r.user_id::text||':'||v_r.currency,'user_reserved_liability',v_r.user_id,v_r.currency);
  v_available := public.financial_ensure_account('user_available:'||v_r.user_id::text||':'||v_r.currency,'user_available_liability',v_r.user_id,v_r.currency);
  v_cash := public.financial_ensure_account('platform_cash:'||v_r.currency,'platform_cash',null,v_r.currency);

  insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id,metadata)
  values(
    'payout-finalize:'||v_r.id||':'||case when p_success then 'paid' else 'failed' end,
    case when p_success then 'payout_paid' else 'payout_failed' end,
    'POSTED',
    v_r.currency,
    case when p_success then 'Levantamento confirmado pelo provedor' else 'Levantamento falhou e a reserva foi libertada' end,
    'payout',v_r.id::text,
    jsonb_build_object('provider_transaction_id',p_provider_transaction_id)
  )
  returning id into v_entry;

  if p_success then
    insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
    values
      (v_entry,v_reserved,'DEBIT',v_r.amount,v_r.currency),
      (v_entry,v_cash,'CREDIT',v_r.amount,v_r.currency);
  else
    insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
    values
      (v_entry,v_reserved,'DEBIT',v_r.amount,v_r.currency),
      (v_entry,v_available,'CREDIT',v_r.amount,v_r.currency);
  end if;

  update public.financial_payout_reservations
  set status=case when p_success then 'PAID' else 'FAILED' end,
      provider_transaction_id=coalesce(p_provider_transaction_id,provider_transaction_id),
      final_journal_entry_id=v_entry,
      finalized_at=now()
  where id=v_r.id
  returning * into v_r;

  return v_r;
end;
$$;

revoke all on function public.finalize_user_payout(uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.finalize_user_payout(uuid,boolean,text) to service_role;
