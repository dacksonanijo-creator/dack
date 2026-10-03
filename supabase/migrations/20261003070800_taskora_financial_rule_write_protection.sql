-- TASKORA FINANCE: distribution rules are immutable to Data API clients

drop policy if exists financial_rules_admin on public.financial_distribution_rules;

create policy financial_rules_admin_read
on public.financial_distribution_rules
for select to authenticated
using (public.is_taskora_admin());

revoke insert, update, delete on public.financial_distribution_rules from authenticated;
grant select on public.financial_distribution_rules to authenticated;
