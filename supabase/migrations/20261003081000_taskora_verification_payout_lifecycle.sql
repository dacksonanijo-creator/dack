-- TASKORA FINANCE: payout lifecycle for verified task rewards
-- These functions do not call a payment provider and cannot be triggered by the browser.

create or replace function public.reserve_task_conversion_for_payout(p_conversion_id text)
returns public.financial_task_conversions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.financial_task_conversions%rowtype;
  v_available uuid;
  v_reserved uuid;
  v_entry uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  select * into v_c from public.financial_task_conversions where conversion_id=p_conversion_id for update;
  if v_c.id is null then raise exception 'conversion not found'; end if;
  if v_c.status='RESERVED' or v_c.status='PAID' then return v_c; end if;
  if v_c.status <> 'AVAILABLE' then raise exception 'conversion must be AVAILABLE before payout reservation'; end if;

  v_available := public.financial_ensure_account('user_available:'||v_c.user_id::text||':'||v_c.currency,'user_available_liability',v_c.user_id,v_c.currency);
  v_reserved := public.financial_ensure_account('user_reserved:'||v_c.user_id::text||':'||v_c.currency,'user_reserved_liability',v_c.user_id,v_c.currency);

  insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id)
  values('conversion-reserve:'||p_conversion_id,'task_conversion_reserve','POSTED',v_c.currency,'Reserva para pedido de levantamento','task_conversion',v_c.id::text)
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_available,'DEBIT',v_c.user_amount,v_c.currency),
    (v_entry,v_reserved,'CREDIT',v_c.user_amount,v_c.currency);

  update public.financial_task_conversions
  set status='RESERVED',updated_at=now()
  where id=v_c.id returning * into v_c;

  return v_c;
end;
$$;

revoke all on function public.reserve_task_conversion_for_payout(text) from public, anon, authenticated;
grant execute on function public.reserve_task_conversion_for_payout(text) to service_role;

create or replace function public.mark_task_conversion_paid(
  p_conversion_id text,
  p_provider_transaction_id text
)
returns public.financial_task_conversions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.financial_task_conversions%rowtype;
  v_reserved uuid;
  v_cash uuid;
  v_entry uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_provider_transaction_id is null or btrim(p_provider_transaction_id)='' then raise exception 'provider transaction id is required'; end if;

  select * into v_c from public.financial_task_conversions where conversion_id=p_conversion_id for update;
  if v_c.id is null then raise exception 'conversion not found'; end if;
  if v_c.status='PAID' then return v_c; end if;
  if v_c.status <> 'RESERVED' then raise exception 'conversion must be RESERVED before PAID'; end if;

  v_reserved := public.financial_ensure_account('user_reserved:'||v_c.user_id::text||':'||v_c.currency,'user_reserved_liability',v_c.user_id,v_c.currency);
  v_cash := public.financial_ensure_account('platform_cash:'||v_c.currency,'platform_cash',null,v_c.currency);

  insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id,metadata)
  values(
    'conversion-paid:'||p_conversion_id,'task_conversion_paid','POSTED',v_c.currency,
    'Pagamento confirmado pelo provedor','task_conversion',v_c.id::text,
    jsonb_build_object('provider_transaction_id',p_provider_transaction_id)
  )
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_reserved,'DEBIT',v_c.user_amount,v_c.currency),
    (v_entry,v_cash,'CREDIT',v_c.user_amount,v_c.currency);

  update public.financial_task_conversions
  set status='PAID',transaction_id=coalesce(transaction_id,p_provider_transaction_id),updated_at=now()
  where id=v_c.id returning * into v_c;

  update public.tasks
  set budget_approved=greatest(0,budget_approved-v_c.user_amount),
      budget_paid=budget_paid+v_c.user_amount,updated_at=now()
  where id=v_c.task_id;

  return v_c;
end;
$$;

revoke all on function public.mark_task_conversion_paid(text,text) from public, anon, authenticated;
grant execute on function public.mark_task_conversion_paid(text,text) to service_role;

create or replace function public.fail_task_conversion_payout(p_conversion_id text,p_reason text)
returns public.financial_task_conversions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.financial_task_conversions%rowtype;
  v_reserved uuid;
  v_available uuid;
  v_entry uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  select * into v_c from public.financial_task_conversions where conversion_id=p_conversion_id for update;
  if v_c.id is null then raise exception 'conversion not found'; end if;
  if v_c.status='FAILED' then return v_c; end if;
  if v_c.status <> 'RESERVED' then raise exception 'conversion must be RESERVED before FAILED'; end if;

  v_reserved := public.financial_ensure_account('user_reserved:'||v_c.user_id::text||':'||v_c.currency,'user_reserved_liability',v_c.user_id,v_c.currency);
  v_available := public.financial_ensure_account('user_available:'||v_c.user_id::text||':'||v_c.currency,'user_available_liability',v_c.user_id,v_c.currency);

  insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id)
  values('conversion-payout-failed:'||p_conversion_id,'task_conversion_payout_failed','POSTED',v_c.currency,coalesce(p_reason,'Payout falhou'),'task_conversion',v_c.id::text)
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_reserved,'DEBIT',v_c.user_amount,v_c.currency),
    (v_entry,v_available,'CREDIT',v_c.user_amount,v_c.currency);

  update public.financial_task_conversions
  set status='FAILED',updated_at=now()
  where id=v_c.id returning * into v_c;

  return v_c;
end;
$$;

revoke all on function public.fail_task_conversion_payout(text,text) from public, anon, authenticated;
grant execute on function public.fail_task_conversion_payout(text,text) to service_role;
