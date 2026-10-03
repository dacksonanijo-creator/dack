-- TASKORA VERIFICATION: audit task-rule changes without storing secrets

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
    insert into public.task_verification_events(
      verification_id,event_type,actor_id,reason,metadata
    )
    select v.id,'TASK_TERMS_CHANGED',auth.uid(),'Task terms changed',
      jsonb_build_object(
        'task_id',new.id,
        'reward_changed',new.reward is distinct from old.reward,
        'budget_changed',new.budget_total is distinct from old.budget_total,
        'verification_method_changed',new.verification_method is distinct from old.verification_method,
        'verification_rules_changed',new.verification_rules is distinct from old.verification_rules
      )
    from public.task_verifications v
    where v.task_id=new.id
    order by v.created_at desc
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists task_verification_terms_audit on public.tasks;
create trigger task_verification_terms_audit
after update on public.tasks
for each row execute function public.audit_task_verification_terms();

revoke all on function public.audit_task_verification_terms() from public, anon, authenticated;
