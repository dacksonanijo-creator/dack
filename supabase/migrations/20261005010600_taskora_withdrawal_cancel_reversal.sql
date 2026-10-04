-- TASKORA WITHDRAWALS: cancellation and provider-confirmed reversal

alter table public.financial_payout_reservations drop constraint if exists financial_payout_reservations_status_check;
alter table public.financial_payout_reservations add constraint financial_payout_reservations_status_check
check (status in ('RESERVED','PAID','FAILED','CANCELLED','REVERSED'));

create or replace function public.cancel_withdrawal(p_withdrawal_id uuid,p_reason text)
returns public.withdrawals language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype; v_from text;
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 if p_reason is null or length(trim(p_reason))<3 then raise exception 'cancellation_reason_required'; end if;
 select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
 if not found then raise exception 'withdrawal_not_found'; end if;
 v_from:=v_w.status::text;
 if v_from not in ('pending','approved','review') then raise exception 'withdrawal_not_cancellable'; end if;
 select * into v_r from public.financial_payout_reservations where withdrawal_id=v_w.id and status='RESERVED' for update;
 if v_r.id is not null then perform public.finalize_user_payout(v_r.id,false,null); update public.financial_payout_reservations set status='CANCELLED' where id=v_r.id; end if;
 update public.withdrawals set status='cancelled',rejection_reason=left(trim(p_reason),1000),processed_at=now(),updated_at=now() where id=v_w.id returning * into v_w;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference,reason) values(v_w.id,auth.uid(),'CANCELLED',v_from,'cancelled',v_w.amount,v_w.currency,v_w.provider,v_w.reference,p_reason);
 perform public.create_taskora_notification(v_w.user_id,'withdrawal_cancelled','Pedido de levantamento cancelado','O seu pedido de levantamento foi cancelado: '||left(trim(p_reason),500),'important','/app/withdrawals',jsonb_build_object('withdrawal_id',v_w.id,'reference',v_w.reference,'reason',p_reason),'withdrawal:'||v_w.id::text||':cancelled','withdrawal');
 return v_w;
end;
$$;
revoke all on function public.cancel_withdrawal(uuid,text) from public,anon;
grant execute on function public.cancel_withdrawal(uuid,text) to authenticated;

create or replace function public.reverse_withdrawal(p_withdrawal_id uuid,p_provider_transaction_id text,p_reason text)
returns public.withdrawals language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype; v_reserved uuid; v_available uuid; v_cash uuid; v_entry uuid;
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 if p_provider_transaction_id is null or length(trim(p_provider_transaction_id))<2 then raise exception 'provider_transaction_id_required'; end if;
 if p_reason is null or length(trim(p_reason))<3 then raise exception 'reversal_reason_required'; end if;
 select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
 if not found then raise exception 'withdrawal_not_found'; end if;
 if v_w.status::text<>'paid' then raise exception 'withdrawal_not_reversible'; end if;
 if v_w.transaction_id is distinct from p_provider_transaction_id then raise exception 'provider_transaction_mismatch'; end if;
 select * into v_r from public.financial_payout_reservations where withdrawal_id=v_w.id and status='PAID' order by finalized_at desc limit 1 for update;
 if v_r.id is null then raise exception 'paid_reservation_not_found'; end if;
 v_reserved:=public.financial_ensure_account('user_reserved:'||v_r.user_id::text||':'||v_r.currency,'user_reserved_liability',v_r.user_id,v_r.currency);
 v_available:=public.financial_ensure_account('user_available:'||v_r.user_id::text||':'||v_r.currency,'user_available_liability',v_r.user_id,v_r.currency);
 v_cash:=public.financial_ensure_account('platform_cash:'||v_r.currency,'platform_cash',null,v_r.currency);
 insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id,metadata)
 values('payout-reversal:'||v_r.id,'payout_reversal','POSTED',v_r.currency,'Reversão confirmada do payout','payout',v_r.id::text,jsonb_build_object('provider_transaction_id',p_provider_transaction_id,'reason',p_reason))
 returning id into v_entry;
 insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
 values(v_entry,v_cash,'DEBIT',v_r.amount,v_r.currency),(v_entry,v_available,'CREDIT',v_r.amount,v_r.currency);
 update public.financial_payout_reservations set status='REVERSED',finalized_at=now() where id=v_r.id;
 update public.withdrawals set status='reversed',reversed_at=now(),updated_at=now() where id=v_w.id returning * into v_w;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference,reason,metadata)
 values(v_w.id,auth.uid(),'REVERSED','paid','reversed',v_w.amount,v_w.currency,v_w.provider,v_w.reference,p_reason,jsonb_build_object('provider_transaction_id',p_provider_transaction_id));
 perform public.create_taskora_notification(v_w.user_id,'withdrawal_reversed','Levantamento revertido','O provedor confirmou a reversão do levantamento. O valor foi devolvido ao saldo disponível.','urgent','/app/withdrawals',jsonb_build_object('withdrawal_id',v_w.id,'reference',v_w.reference,'transaction_id',p_provider_transaction_id),'withdrawal:'||v_w.id::text||':reversed','withdrawal');
 return v_w;
end;
$$;
revoke all on function public.reverse_withdrawal(uuid,text,text) from public,anon;
grant execute on function public.reverse_withdrawal(uuid,text,text) to authenticated;
