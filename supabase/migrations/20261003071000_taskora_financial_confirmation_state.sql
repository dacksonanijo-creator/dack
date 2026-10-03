-- TASKORA FINANCE: explicit provider confirmation state

create or replace function public.confirm_task_conversion(p_conversion_id text)
returns public.financial_task_conversions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.financial_task_conversions%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;

  select * into v_c
  from public.financial_task_conversions
  where conversion_id = p_conversion_id
  for update;

  if v_c.id is null then raise exception 'conversion not found'; end if;
  if v_c.status in ('CONFIRMED','AVAILABLE','PAID') then return v_c; end if;
  if v_c.status <> 'PENDING' then
    raise exception 'conversion cannot be confirmed from current state';
  end if;

  update public.financial_task_conversions
  set status='CONFIRMED', confirmed_at=now(), updated_at=now()
  where id=v_c.id
  returning * into v_c;

  return v_c;
end;
$$;

revoke all on function public.confirm_task_conversion(text) from public, anon, authenticated;
grant execute on function public.confirm_task_conversion(text) to service_role;

drop function if exists public.make_task_conversion_available(text);

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
  if v_c.status <> 'CONFIRMED' then
    raise exception 'conversion must be CONFIRMED before becoming AVAILABLE';
  end if;

  v_pending_user := public.financial_ensure_account('user_pending:'||v_c.user_id::text||':'||v_c.currency,'user_pending_liability',v_c.user_id,v_c.currency);
  v_available_user := public.financial_ensure_account('user_available:'||v_c.user_id::text||':'||v_c.currency,'user_available_liability',v_c.user_id,v_c.currency);
  v_pending_platform := public.financial_ensure_account('platform_pending_revenue:'||v_c.currency,'platform_pending_revenue',null,v_c.currency);
  v_revenue_platform := public.financial_ensure_account('platform_revenue:'||v_c.currency,'platform_revenue',null,v_c.currency);

  insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id)
  values('conversion-available:'||p_conversion_id,'task_conversion_available','POSTED',v_c.currency,'Passagem de CONFIRMED para AVAILABLE','task_conversion',v_c.id::text)
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_pending_user,'DEBIT',v_c.user_amount,v_c.currency),
    (v_entry,v_available_user,'CREDIT',v_c.user_amount,v_c.currency),
    (v_entry,v_pending_platform,'DEBIT',v_c.taskora_amount,v_c.currency),
    (v_entry,v_revenue_platform,'CREDIT',v_c.taskora_amount,v_c.currency);

  update public.financial_task_conversions
  set status='AVAILABLE', available_at=now(), updated_at=now()
  where id=v_c.id
  returning * into v_c;

  return v_c;
end;
$$;

revoke all on function public.make_task_conversion_available(text) from public, anon, authenticated;
grant execute on function public.make_task_conversion_available(text) to service_role;
