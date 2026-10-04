-- TASKORA WITHDRAWALS: provider payout logs
create table if not exists public.payout_logs (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid references public.withdrawals(id) on delete restrict,
  provider text not null,
  environment text not null,
  action text not null,
  request jsonb,
  response jsonb,
  http_status integer,
  created_at timestamptz not null default now()
);
alter table public.payout_logs enable row level security;
revoke all on public.payout_logs from anon,authenticated;
grant select on public.payout_logs to authenticated;
grant all on public.payout_logs to service_role;
drop policy if exists admins_view_payout_logs on public.payout_logs;
create policy admins_view_payout_logs on public.payout_logs for select to authenticated using (public.is_taskora_admin());
