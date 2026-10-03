-- TASKORA VERIFICATION: enforce task budgets at database boundary

create or replace function public.task_budget_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.origin is null then
    new.origin := case
      when new.external_source is not null or new.partner_api_id is not null then 'provider'
      when new.company_id is not null then 'company'
      else 'admin'
    end;
  end if;

  if new.reward > 0 and new.budget_total is null then
    raise exception 'budget_total is required for remunerated tasks';
  end if;

  if new.budget_total is not null and new.budget_total < new.reward * greatest(new.slots,1) then
    raise exception 'task budget is below the maximum planned reward';
  end if;

  if new.budget_reserved < 0 or new.budget_approved < 0 or new.budget_paid < 0 then
    raise exception 'task budget counters cannot be negative';
  end if;

  if new.budget_reserved + new.budget_approved + new.budget_paid > new.budget_total then
    raise exception 'task budget allocation exceeds budget_total';
  end if;

  return new;
end;
$$;

drop trigger if exists task_budget_guard on public.tasks;
create trigger task_budget_guard
before insert or update on public.tasks
for each row execute function public.task_budget_guard();

revoke all on function public.task_budget_guard() from public, anon, authenticated;
