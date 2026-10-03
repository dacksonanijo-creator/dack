-- TASKORA VERIFICATION: freeze financial/verification terms once a task has activity

create or replace function public.task_terms_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op='UPDATE' and exists (
    select 1 from public.task_submissions s where s.task_id=old.id
  ) then
    if new.reward is distinct from old.reward
       or new.currency is distinct from old.currency
       or new.budget_total is distinct from old.budget_total
       or new.verification_method is distinct from old.verification_method
       or new.verification_rules is distinct from old.verification_rules
       or new.slots < old.slots_filled then
      raise exception 'task financial and verification terms are frozen after submission';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists task_terms_guard on public.tasks;
create trigger task_terms_guard
before update on public.tasks
for each row execute function public.task_terms_guard();

revoke all on function public.task_terms_guard() from public, anon, authenticated;
