-- TASKORA VERIFICATION: richer admin queue read model

drop function if exists public.get_pending_task_verifications();

create or replace function public.get_pending_task_verifications()
returns table(
  id uuid,
  task_id uuid,
  submission_id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  task_title text,
  origin text,
  verification_type text,
  provider text,
  value numeric,
  currency text,
  status text,
  decision_reason text,
  created_at timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select
    v.id,
    v.task_id,
    v.submission_id,
    v.user_id,
    coalesce(p.full_name,'') as user_name,
    coalesce(u.email,'') as user_email,
    t.title as task_title,
    v.origin,
    v.verification_type,
    v.provider,
    v.value,
    v.currency,
    v.status,
    v.decision_reason,
    v.created_at
  from public.task_verifications v
  join public.tasks t on t.id=v.task_id
  join auth.users u on u.id=v.user_id
  left join public.profiles p on p.id=v.user_id
  where public.is_taskora_admin()
    and v.status in ('PENDING','REVIEW')
  order by v.created_at asc
$$;

revoke all on function public.get_pending_task_verifications() from public, anon;
grant execute on function public.get_pending_task_verifications() to authenticated;
