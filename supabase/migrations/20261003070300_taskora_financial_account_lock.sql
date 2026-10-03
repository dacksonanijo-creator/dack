-- TASKORA FINANCE: concurrency hardening for ledger account creation

create or replace function public.financial_ensure_account(
  p_account_key text,
  p_account_type text,
  p_user_id uuid,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.financial_accounts(account_key, account_type, user_id, currency)
  values (p_account_key, p_account_type, p_user_id, p_currency)
  on conflict (account_key, currency)
  do update set account_key = excluded.account_key
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.financial_ensure_account(text,text,uuid,text) from public, anon, authenticated;
