-- TASKORA WITHDRAWALS: cancellation uses an explicit ledger cancellation entry
create or replace function public.cancel_withdrawal(p_withdrawal_id uuid,p_reason text)
returns public.withdrawals language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype;
v_reserved uuid; v_available uuid; v_entry uuid; v_from text;
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 if p_reason is null or length(trim(p_reason))<3 then raise exception 'cancellation_reason_required'; end if;
 select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
 if not found then raise exception 'withdrawal_not_found'; end if;
 v_from:=v_w.status::text;
 if v_from not in ('pending','approved','review') then raise exception 'withdrawal_not_cancellable'; end if;
 select * into v_r from public.financial_payout_reservations where withdrawal_id=v_w.id and status='RESERVED' for update;
 if v_r.id is not null then
   v_reserved:=public.financial_ensure_account('user_reserved:'||v_r.user_id::text||':'||v_r.currency,'user_reserved_liability',v_r.user_id,v_r.currency);
   v_available:=public.financial_ensure_account('user_available:'||v_r.user_id::text||':'||v_r.currency,'user_available_liability',v_r.user_id,v_r.currency);
   insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id,metadata)
   values('payout-cancel:'||v_r.id,'payout_cancelled','POSTED',v_r.currency,'Reserva de levantamento cancelada','payout',v_r.id::text,jsonb_build_object('reason',p_reason))
   returning id into v_entry;
   insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
   values(v_entry,v_reserved,'DEBIT',v_r.amount,v_r.currency),(v_entry,v_available,'CREDIT',v_r.amount,v_r.currency);
   update public.financial_payout_reservations set status='CANCELLED',final_journal_entry_id=v_entry,finalized_at=now() where id=v_r.id;
 end if;
 update public.withdrawals set status='cancelled',rejection_reason=left(trim(p_reason),1000),processed_at=now(),updated_at=now()
 where id=v_w.id returning * into v_w;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference,reason)
 values(v_w.id,auth.uid(),'CANCELLED',v_from,'cancelled',v_w.amount,v_w.currency,v_w.provider,v_w.reference,p_reason);
 perform public.create_taskora_notification(v_w.user_id,'withdrawal_cancelled','Pedido de levantamento cancelado','O seu pedido de levantamento foi cancelado: '||left(trim(p_reason),500),'important','/app/withdrawals',jsonb_build_object('withdrawal_id',v_w.id,'reference',v_w.reference,'reason',p_reason),'withdrawal:'||v_w.id::text||':cancelled','withdrawal');
 return v_w;
end;
$$;
revoke all on function public.cancel_withdrawal(uuid,text) from public,anon;
grant execute on function public.cancel_withdrawal(uuid,text) to authenticated;
