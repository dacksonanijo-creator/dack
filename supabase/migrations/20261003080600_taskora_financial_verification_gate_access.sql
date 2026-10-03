-- TASKORA FINANCE/VERIFICATION: allow only trusted admins or service role to release/reverse
-- Nested calls from the protected verification RPC retain the caller role.

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
  if auth.role() <> 'service_role' and not public.is_taskora_admin() then raise exception 'not authorized'; end if;

  select * into v_c from public.financial_task_conversions where conversion_id=p_conversion_id for update;
  if v_c.id is null then raise exception 'conversion not found'; end if;
  if v_c.status in ('AVAILABLE','PAID') then return v_c; end if;
  if v_c.status <> 'CONFIRMED' and v_c.status <> 'PENDING' then
    raise exception 'conversion cannot become available from current state';
  end if;

  v_pending_user := public.financial_ensure_account('user_pending:'||v_c.user_id::text||':'||v_c.currency,'user_pending_liability',v_c.user_id,v_c.currency);
  v_available_user := public.financial_ensure_account('user_available:'||v_c.user_id::text||':'||v_c.currency,'user_available_liability',v_c.user_id,v_c.currency);
  v_pending_platform := public.financial_ensure_account('platform_pending_revenue:'||v_c.currency,'platform_pending_revenue',null,v_c.currency);
  v_revenue_platform := public.financial_ensure_account('platform_revenue:'||v_c.currency,'platform_revenue',null,v_c.currency);

  insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id)
  values('conversion-available:'||p_conversion_id,'task_conversion_available','POSTED',v_c.currency,'Libertação financeira após aprovação da verificação','task_conversion',v_c.id::text)
  on conflict (reference) do nothing
  returning id into v_entry;

  if v_entry is null then
    select id into v_entry from public.financial_journal_entries where reference='conversion-available:'||p_conversion_id;
  else
    insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
    values
      (v_entry,v_pending_user,'DEBIT',v_c.user_amount,v_c.currency),
      (v_entry,v_available_user,'CREDIT',v_c.user_amount,v_c.currency),
      (v_entry,v_pending_platform,'DEBIT',v_c.taskora_amount,v_c.currency),
      (v_entry,v_revenue_platform,'CREDIT',v_c.taskora_amount,v_c.currency);
  end if;

  update public.financial_task_conversions
  set status='AVAILABLE', confirmed_at=coalesce(confirmed_at,now()), available_at=now(), updated_at=now()
  where id=v_c.id
  returning * into v_c;

  return v_c;
end;
$$;

revoke all on function public.make_task_conversion_available(text) from public, anon;
grant execute on function public.make_task_conversion_available(text) to authenticated;

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
  if auth.role() <> 'service_role' and not public.is_taskora_admin() then raise exception 'not authorized'; end if;
  if p_reason is null or btrim(p_reason)='' then raise exception 'reversal reason is required'; end if;

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
  values('conversion-reversal:'||p_conversion_id,'task_conversion_reversal','REVERSED',v_c.currency,
    'Reversão de conversão: '||p_reason,'task_conversion',v_c.id::text,
    jsonb_build_object('reason',p_reason,'original_conversion',p_conversion_id))
  on conflict (reference) do nothing
  returning id into v_entry;

  if v_entry is null then
    select id into v_entry from public.financial_journal_entries where reference='conversion-reversal:'||p_conversion_id;
  else
    insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
    values
      (v_entry,v_user_account,'DEBIT',v_c.user_amount,v_c.currency),
      (v_entry,v_platform_account,'DEBIT',v_c.taskora_amount,v_c.currency),
      (v_entry,v_provider_account,'CREDIT',v_c.distributable_amount,v_c.currency);
  end if;

  update public.financial_task_conversions
  set status='REVERSED', reversal_journal_entry_id=v_entry, reversed_at=now(), reversal_reason=p_reason, updated_at=now()
  where id=v_c.id
  returning * into v_c;

  return v_c;
end;
$$;

revoke all on function public.reverse_task_conversion(text,text) from public, anon;
grant execute on function public.reverse_task_conversion(text,text) to authenticated;
