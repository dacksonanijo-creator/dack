-- TASKORA FINANCE: require an explicit distributable amount

drop function if exists public.recognize_task_conversion(
  uuid,text,uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,text,numeric,numeric,numeric,jsonb
);

create or replace function public.recognize_task_conversion(
  p_task_id uuid,
  p_conversion_id text,
  p_user_id uuid,
  p_provider text,
  p_provider_transaction_id text,
  p_transaction_id text,
  p_idempotency_key text,
  p_gross_amount numeric,
  p_provider_fees numeric default 0,
  p_adjustments numeric default 0,
  p_reversals numeric default 0,
  p_distributable_amount numeric default null,
  p_currency text default 'MZN',
  p_original_currency text default null,
  p_original_amount numeric default null,
  p_exchange_rate numeric default null,
  p_converted_amount numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.financial_task_conversions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule public.financial_distribution_rules%rowtype;
  v_conversion public.financial_task_conversions%rowtype;
  v_existing public.financial_task_conversions%rowtype;
  v_net numeric(20,2);
  v_user_amount numeric(20,2);
  v_taskora_amount numeric(20,2);
  v_distributable numeric(20,2);
  v_provider_account uuid;
  v_pending_user_account uuid;
  v_pending_platform_account uuid;
  v_entry uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  if p_user_id is null or p_provider is null or btrim(p_provider) = '' then
    raise exception 'conversion identity is required';
  end if;
  if p_gross_amount is null or p_gross_amount < 0
     or p_provider_fees is null or p_provider_fees < 0
     or p_reversals is null or p_reversals < 0
     or p_distributable_amount is null or p_distributable_amount < 0 then
    raise exception 'invalid financial amount';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select * into v_existing
  from public.financial_task_conversions
  where idempotency_key = p_idempotency_key
     or (p_provider_transaction_id is not null
         and provider = p_provider
         and provider_transaction_id = p_provider_transaction_id)
  limit 1;

  if v_existing.id is not null then
    return v_existing;
  end if;

  select * into v_rule
  from public.financial_distribution_rules
  where active = true
  order by version desc
  limit 1
  for update;

  if v_rule.id is null then
    raise exception 'distribution rule not configured';
  end if;

  v_net := round(p_gross_amount - p_provider_fees + p_adjustments - p_reversals, 2);
  if v_net < 0 then
    raise exception 'net amount cannot be negative';
  end if;

  v_distributable := round(p_distributable_amount, 2);
  if v_distributable > v_net then
    raise exception 'distributable amount cannot exceed net amount';
  end if;

  v_user_amount := round(v_distributable * v_rule.user_percent / 100, 2);
  v_taskora_amount := round(v_distributable - v_user_amount, 2);

  if v_user_amount + v_taskora_amount <> v_distributable then
    raise exception 'distribution rounding mismatch';
  end if;

  insert into public.financial_task_conversions(
    task_id, conversion_id, user_id, provider, provider_transaction_id, transaction_id,
    idempotency_key, gross_amount, provider_fees, adjustments, reversals, net_amount,
    distributable_amount, taskora_percent, user_percent, taskora_amount, user_amount,
    currency, status, distribution_rule_id, original_currency, original_amount,
    exchange_rate, converted_amount, metadata
  )
  values(
    p_task_id, p_conversion_id, p_user_id, p_provider, p_provider_transaction_id, p_transaction_id,
    p_idempotency_key, round(p_gross_amount,2), round(p_provider_fees,2), round(p_adjustments,2),
    round(p_reversals,2), v_net, v_distributable, v_rule.taskora_percent, v_rule.user_percent,
    v_taskora_amount, v_user_amount, p_currency, 'PENDING', v_rule.id,
    p_original_currency, p_original_amount, p_exchange_rate, p_converted_amount, coalesce(p_metadata,'{}'::jsonb)
  )
  returning * into v_conversion;

  v_provider_account := public.financial_ensure_account(
    'provider_receivable:' || p_provider || ':' || p_currency,
    'provider_receivable', null, p_currency
  );
  v_pending_user_account := public.financial_ensure_account(
    'user_pending:' || p_user_id::text || ':' || p_currency,
    'user_pending_liability', p_user_id, p_currency
  );
  v_pending_platform_account := public.financial_ensure_account(
    'platform_pending_revenue:' || p_currency,
    'platform_pending_revenue', null, p_currency
  );

  insert into public.financial_journal_entries(
    reference, entry_type, status, currency, description, source_type, source_id, metadata
  )
  values(
    'conversion:' || p_conversion_id,
    'task_conversion', 'POSTED', p_currency,
    'Reconhecimento de conversão de tarefa em estado PENDING',
    'task_conversion', v_conversion.id::text,
    jsonb_build_object('distribution_rule_id',v_rule.id,'provider',p_provider)
  )
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_provider_account,'DEBIT',v_distributable,p_currency),
    (v_entry,v_pending_user_account,'CREDIT',v_user_amount,p_currency),
    (v_entry,v_pending_platform_account,'CREDIT',v_taskora_amount,p_currency);

  update public.financial_task_conversions
  set original_journal_entry_id=v_entry, updated_at=now()
  where id=v_conversion.id;

  return (select c from public.financial_task_conversions c where c.id=v_conversion.id);
end;
$$;



revoke all on function public.recognize_task_conversion(uuid,text,uuid,text,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text,numeric,numeric,numeric,jsonb) from public, anon, authenticated;
grant execute on function public.recognize_task_conversion(uuid,text,uuid,text,text,text,text,numeric,numeric,numeric,numeric,numeric,text,text,numeric,numeric,numeric,jsonb) to service_role;
