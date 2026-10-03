-- TASKORA VERIFICATION: durable task-level audit trail

create table if not exists public.task_audit_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.task_audit_log enable row level security;
revoke all on public.task_audit_log from anon, authenticated;
grant select on public.task_audit_log to authenticated;

create policy task_audit_admin_or_company
on public.task_audit_log for select to authenticated
using (
  public.is_taskora_admin()
  or exists (
    select 1 from public.tasks t
    join public.companies c on c.id=t.company_id
    where t.id=task_audit_log.task_id and c.owner_id=auth.uid()
  )
);

create or replace function public.audit_task_verification_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op='UPDATE' and (
    new.reward is distinct from old.reward
    or new.currency is distinct from old.currency
    or new.budget_total is distinct from old.budget_total
    or new.verification_method is distinct from old.verification_method
    or new.verification_rules is distinct from old.verification_rules
  ) then
    insert into public.task_audit_log(task_id,actor_id,action,metadata)
    values(
      new.id,auth.uid(),'TASK_TERMS_CHANGED',
      jsonb_build_object(
        'reward_changed',new.reward is distinct from old.reward,
        'budget_changed',new.budget_total is distinct from old.budget_total,
        'verification_method_changed',new.verification_method is distinct from old.verification_method,
        'verification_rules_changed',new.verification_rules is distinct from old.verification_rules
      )
    );
  end if;
  return new;
end;
$$;
