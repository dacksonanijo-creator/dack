-- TASKORA WITHDRAWALS: user wallet summary and controlled retries

create or replace function public.get_my_withdrawal_summary()
returns table(available numeric,reserved numeric,currency text)
language sql stable security definer set search_path=''
as $$
  with a as (
    select fa.currency,
      coalesce(sum(case when l.direction='CREDIT' then l.amount else -l.amount end),0) amount
    from public.financial_accounts fa
    left join public.financial_ledger_lines l on l.account_id=fa.id
    join public.financial_journal_entries j on j.id=l.journal_entry_id and j.status in ('POSTED','REVERSED')
    where fa.user_id=auth.uid() and fa.account_type='user_available_liability'
    group by fa.currency
  ), r as (
    select fa.currency,
      coalesce(sum(case when l.direction='CREDIT' then l.amount else -l.amount end),0) amount
    from public.financial_accounts fa
    left join public.financial_ledger_lines l on l.account_id=fa.id
    left join public.financial_journal_entries j on j.id=l.journal_entry_id and j.status in ('POSTED','REVERSED')
    where fa.user_id=auth.uid() and fa.account_type='user_reserved_liability'
    group by fa.currency
  )
  select coalesce(a.amount,0),coalesce(r.amount,0),coalesce(a.currency,r.currency,'MZN')
  from a full join r on r.currency=a.currency;
$$;
revoke all on function public.get_my_withdrawal_summary() from public,anon;
grant execute on function public.get_my_withdrawal_summary() to authenticated;

create or replace function public.retry_failed_withdrawal(p_withdrawal_id uuid)
returns public.withdrawals
language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype;
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
 if not found then raise exception 'withdrawal_not_found'; end if;
 if v_w.status::text<>'failed' then raise exception 'withdrawal_not_retryable'; end if;
 select * into v_r from public.financial_payout_reservations where withdrawal_id=v_w.id for update;
 if v_r.id is null or v_r.status<>'FAILED' then raise exception 'withdrawal_reservation_not_retryable'; end if;
 -- A retry creates a new reservation/journal operation; the original failed operation remains immutable.
 v_r := public.reserve_user_funds(v_w.user_id,v_w.amount,v_w.currency,'withdrawal-retry:'||v_w.id::text||':'||gen_random_uuid()::text,null);
 update public.withdrawals
 set status='approved',failure_reason=null,approved_at=now(),rejected_at=null,processed_at=null,updated_at=now()
 where id=v_w.id returning * into v_w;
 update public.financial_payout_reservations set withdrawal_id=v_w.id where id=v_r.id;
 return v_w;
end;
$$;
revoke all on function public.retry_failed_withdrawal(uuid) from public,anon;
grant execute on function public.retry_failed_withdrawal(uuid) to authenticated;
