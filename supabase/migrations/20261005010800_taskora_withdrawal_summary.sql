-- TASKORA WITHDRAWALS: real administrative status summary
create or replace function public.get_admin_withdrawal_summary()
returns table(status text,count bigint,amount numeric)
language sql stable security definer set search_path=''
as $$
  select status::text,count(*),coalesce(sum(amount),0)
  from public.withdrawals
  where public.is_taskora_admin()
  group by status
  order by status;
$$;
revoke all on function public.get_admin_withdrawal_summary() from public,anon;
grant execute on function public.get_admin_withdrawal_summary() to authenticated;
