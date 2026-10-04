-- TASKORA WITHDRAWALS: allow immutable failed attempts while keeping one active payout reservation
drop index if exists public.financial_payout_reservations_withdrawal_key;
create unique index if not exists financial_payout_reservations_active_withdrawal_key
on public.financial_payout_reservations(withdrawal_id)
where withdrawal_id is not null and status in ('RESERVED','PAID');

create or replace function public.retry_failed_withdrawal(p_withdrawal_id uuid)
returns public.withdrawals
language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype; v_old_reservation uuid;
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
 if not found then raise exception 'withdrawal_not_found'; end if;
 if v_w.status::text<>'failed' then raise exception 'withdrawal_not_retryable'; end if;
 select * into v_r from public.financial_payout_reservations where withdrawal_id=v_w.id and status='FAILED' order by finalized_at desc limit 1;
 if v_r.id is null then raise exception 'withdrawal_reservation_not_retryable'; end if;
 v_old_reservation:=v_r.id;
 v_r := public.reserve_user_funds(v_w.user_id,v_w.amount,v_w.currency,'withdrawal-retry:'||v_w.id::text||':'||gen_random_uuid()::text,v_w.id);
 update public.withdrawals
 set status='approved',failure_reason=null,approved_at=now(),rejected_at=null,processed_at=null,updated_at=now()
 where id=v_w.id returning * into v_w;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference,metadata)
 values(v_w.id,auth.uid(),'RETRY','failed','approved',v_w.amount,v_w.currency,v_w.provider,v_w.reference,jsonb_build_object('new_reservation_id',v_r.id,'previous_reservation_id',v_old_reservation));
 return v_w;
end;
$$;
revoke all on function public.retry_failed_withdrawal(uuid) from public,anon;
grant execute on function public.retry_failed_withdrawal(uuid) to authenticated;
