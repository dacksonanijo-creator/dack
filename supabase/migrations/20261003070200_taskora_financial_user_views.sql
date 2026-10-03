-- TASKORA FINANCE: user ledger read model

create or replace function public.get_my_financial_wallet_movements(p_limit integer default 50)
returns table(
  id uuid,
  kind text,
  amount numeric,
  currency text,
  status text,
  reference text,
  created_at timestamptz
)
language sql
stable
security invoker
as $$
  select
    c.id,
    'earning'::text,
    c.user_amount,
    c.currency,
    c.status,
    c.conversion_id,
    c.created_at
  from public.financial_task_conversions c
  where c.user_id = auth.uid()
  order by c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
$$;

grant execute on function public.get_my_financial_wallet_movements(integer) to authenticated;
