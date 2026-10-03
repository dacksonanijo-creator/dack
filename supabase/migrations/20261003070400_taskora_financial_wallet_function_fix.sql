-- TASKORA FINANCE: replace wallet read function after return-shape expansion

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
