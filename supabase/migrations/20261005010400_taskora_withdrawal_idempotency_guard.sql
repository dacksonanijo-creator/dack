-- TASKORA WITHDRAWALS: provider transaction uniqueness
create unique index if not exists withdrawals_provider_transaction_key
on public.withdrawals(provider,transaction_id)
where provider is not null and transaction_id is not null;
