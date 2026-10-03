-- TASKORA FINANCE: ledger immutability and balanced journal enforcement

create or replace function public.financial_assert_balanced_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from new_rows n
    join public.financial_journal_entries j on j.id=n.journal_entry_id
    group by n.journal_entry_id, j.currency
    having round(sum(case when n.direction='DEBIT' then n.amount else 0 end),2)
        <> round(sum(case when n.direction='CREDIT' then n.amount else 0 end),2)
  ) then
    raise exception 'unbalanced financial journal entry';
  end if;

  return null;
end;
$$;

drop trigger if exists financial_ledger_balance_check on public.financial_ledger_lines;
create trigger financial_ledger_balance_check
after insert on public.financial_ledger_lines
referencing new table as new_rows
for each statement
execute function public.financial_assert_balanced_insert();

create or replace function public.financial_ledger_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'financial ledger lines are immutable';
end;
$$;

drop trigger if exists financial_ledger_no_update on public.financial_ledger_lines;
create trigger financial_ledger_no_update
before update or delete on public.financial_ledger_lines
for each row
execute function public.financial_ledger_immutable();

drop trigger if exists financial_journal_no_update on public.financial_journal_entries;
create trigger financial_journal_no_update
before update or delete on public.financial_journal_entries
for each row
execute function public.financial_ledger_immutable();

revoke all on function public.financial_assert_balanced_insert() from public, anon, authenticated;
revoke all on function public.financial_ledger_immutable() from public, anon, authenticated;
