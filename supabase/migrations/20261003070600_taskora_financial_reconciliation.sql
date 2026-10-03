-- TASKORA FINANCE: explicit reconciliation checks

create or replace function public.record_financial_reconciliation(
  p_scope text,
  p_reference_id text,
  p_currency text,
  p_ledger_amount numeric,
  p_external_amount numeric,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_difference numeric(20,2);
  v_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_scope is null or btrim(p_scope) = '' then raise exception 'scope is required'; end if;
  if p_currency is null or btrim(p_currency) = '' then raise exception 'currency is required'; end if;

  v_difference := round(coalesce(p_ledger_amount,0) - coalesce(p_external_amount,0), 2);

  if v_difference = 0 then
    return null;
  end if;

  insert into public.financial_reconciliation_flags(
    scope, reference_id, currency, ledger_amount, external_amount, difference, status, details
  )
  values(
    p_scope, p_reference_id, p_currency, coalesce(p_ledger_amount,0), coalesce(p_external_amount,0),
    v_difference, 'OPEN', coalesce(p_details,'{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_financial_reconciliation(text,text,text,numeric,numeric,jsonb) from public, anon, authenticated;
grant execute on function public.record_financial_reconciliation(text,text,text,numeric,numeric,jsonb) to service_role;
