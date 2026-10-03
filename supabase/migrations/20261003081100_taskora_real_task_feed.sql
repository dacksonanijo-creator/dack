-- TASKORA VERIFICATION: real task feed for authenticated users

create or replace function public.get_available_taskora_tasks()
returns table(
  id uuid,
  title text,
  description text,
  category text,
  reward numeric,
  currency text,
  slots integer,
  slots_filled integer,
  deadline timestamptz,
  origin text,
  verification_method text
)
language sql stable security invoker
as $$
  select
    t.id,t.title,t.description,t.category,t.reward,t.currency,t.slots,t.slots_filled,t.deadline,t.origin,t.verification_method
  from public.tasks t
  where t.status='active'
    and (t.deadline is null or t.deadline >= now())
    and t.reward > 0
    and t.budget_total is not null
    and t.budget_reserved + t.reward <= t.budget_total
    and t.slots_filled < t.slots
    and not exists (
      select 1 from public.task_submissions s
      where s.task_id=t.id and s.user_id=auth.uid()
    )
  order by t.created_at desc
$$;

grant execute on function public.get_available_taskora_tasks() to authenticated;
