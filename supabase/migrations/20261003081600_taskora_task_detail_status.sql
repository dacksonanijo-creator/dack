-- TASKORA VERIFICATION: task detail with caller's verification state

create or replace function public.get_taskora_task(p_task_id uuid)
returns table(
  id uuid,title text,description text,category text,reward numeric,currency text,
  slots integer,slots_filled integer,deadline timestamptz,origin text,verification_method text,
  verification_status text,verification_id uuid,verification_reason text
)
language sql stable security invoker
as $$
  select
    t.id,t.title,t.description,t.category,t.reward,t.currency,t.slots,t.slots_filled,t.deadline,t.origin,t.verification_method,
    v.status,v.id,v.decision_reason
  from public.tasks t
  left join public.task_submissions s on s.task_id=t.id and s.user_id=auth.uid()
  left join public.task_verifications v on v.submission_id=s.id
  where t.id=p_task_id
    and (
      t.status='active'
      or s.id is not null
    )
  limit 1
$$;

grant execute on function public.get_taskora_task(uuid) to authenticated;
