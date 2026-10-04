-- TASKORA WITHDRAWALS: preserve reversal journal reference
create or replace function public.reverse_withdrawal(p_withdrawal_id uuid,p_provider_transaction_id text,p_reason text)
returns public.withdrawals language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype; v_available uuid; v_cash uuid; v_entry uuid;
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
 v_available:=public.financial_ensure_account('user_available:'||v_r.user_id::text||':'||v_r.currency,'user_available_liability',v_r.user_id,v_r.currency);
 v_cash:=public.financial_ensure_account('platform_cash:'||v_r.currency,'platform_cash',null,v_r.currency);
 insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id,metadata)
 values('payout-reversal:'||v_r.id,'payout_reversal','POSTED',v_r.currency,'Reversão confirmada do payout','payout',v_r.id::text,jsonb_build_object('provider_transaction_id',p_provider_transaction_id,'reason',p_reason))
 returning id into v_entry;
 insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
 values(v_entry,v_cash,'DEBIT',v_r.amount,v_r.currency),(v_entry,v_available,'CREDIT',v_r.amount,v_r.currency);
 update public.financial_payout_reservations set status='REVERSED',final_journal_entry_id=v_entry,finalized_at=now() where id=v_r.id;
 update public.withdrawals set status='reversed',reversed_at=now(),updated_at=now() where id=v_w.id returning * into v_w;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference,reason,metadata)
 values(v_w.id,auth.uid(),'REVERSED','paid','reversed',v_w.amount,v_w.currency,v_w.provider,v_w.reference,p_reason,jsonb_build_object('provider_transaction_id',p_provider_transaction_id,'ledger_journal_entry_id',v_entry));
 perform public.create_taskora_notification(v_w.user_id,'withdrawal_reversed','Levantamento revertido','O provedor confirmou a reversão do levantamento. O valor foi devolvido ao saldo disponível.','urgent','/app/withdrawals',jsonb_build_object('withdrawal_id',v_w.id,'reference',v_w.reference,'transaction_id',p_provider_transaction_id),'withdrawal:'||v_w.id::text||':reversed','withdrawal');
 return v_w;
end;
$$;
revoke all on function public.reverse_withdrawal(uuid,text,text) from public,anon;
grant execute on function public.reverse_withdrawal(uuid,text,text) to authenticated;
