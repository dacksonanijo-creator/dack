-- TASKORA VERIFICATION: harden trusted submission recognition and reserve the task budget in ledger

alter table public.tasks
  add column if not exists currency text not null default 'MZN';

alter table public.financial_accounts
  drop constraint if exists financial_accounts_account_type_check;

alter table public.financial_accounts
  add constraint financial_accounts_account_type_check check (account_type in (
    'provider_receivable',
    'platform_cash',
    'platform_pending_revenue',
    'platform_revenue',
    'user_pending_liability',
    'user_available_liability',
    'user_reserved_liability',
    'task_budget_reserve'
  ));

drop function if exists public.recognize_task_conversion_for_submission(uuid,uuid,uuid,text,text,text,numeric,text);

create or replace function public.recognize_task_conversion_for_submission(
  p_submission_id uuid,
  p_task_id uuid,
  p_user_id uuid,
  p_provider text,
  p_provider_source text,
  p_conversion_id text,
  p_currency text
)
returns public.financial_task_conversions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.task_submissions%rowtype;
  v_t public.tasks%rowtype;
  v_existing public.financial_task_conversions%rowtype;
  v_rule public.financial_distribution_rules%rowtype;
  v_net numeric(20,2);
  v_user numeric(20,2);
  v_platform numeric(20,2);
  v_user_account uuid;
  v_platform_account uuid;
  v_budget_account uuid;
  v_entry uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_s
  from public.task_submissions
  where id=p_submission_id and user_id=auth.uid()
  for update;

  if v_s.id is null then raise exception 'submission not found'; end if;

  select * into v_t from public.tasks where id=p_task_id for update;
  if v_t.id is null or v_t.id<>v_s.task_id then raise exception 'task mismatch'; end if;

  select * into v_existing from public.financial_task_conversions where conversion_id=p_conversion_id for update;
  if v_existing.id is not null then return v_existing; end if;

  if v_s.reward_amount <> v_t.reward then raise exception 'submission reward does not match task reward'; end if;
  if v_t.budget_total is null or v_t.budget_reserved + v_t.reward > v_t.budget_total then
    raise exception 'insufficient task budget';
  end if;

  select * into v_rule from public.financial_distribution_rules
  where active=true order by version desc limit 1 for update;
  if v_rule.id is null then raise exception 'distribution rule not configured'; end if;

  v_net := round(v_t.reward,2);
  v_user := round(v_net*v_rule.user_percent/100,2);
  v_platform := round(v_net-v_user,2);

  insert into public.financial_task_conversions(
    task_id,conversion_id,user_id,provider,provider_transaction_id,transaction_id,idempotency_key,
    gross_amount,provider_fees,adjustments,reversals,net_amount,distributable_amount,
    taskora_percent,user_percent,taskora_amount,user_amount,currency,status,distribution_rule_id,metadata
  )
  values(
    p_task_id,p_conversion_id,p_user_id,coalesce(p_provider,'taskora'),null,null,
    'submission:'||p_submission_id::text,v_t.reward,0,0,0,v_net,v_net,
    v_rule.taskora_percent,v_rule.user_percent,v_platform,v_user,coalesce(p_currency,v_t.currency),'PENDING',
    v_rule.id,jsonb_build_object('source','task_submission','submission_id',p_submission_id,'provider_source',p_provider_source)
  )
  returning * into v_existing;

  v_budget_account := public.financial_ensure_account(
    'task_budget:'||p_task_id::text||':'||v_t.currency,
    'task_budget_reserve',null,v_t.currency
  );
  v_user_account := public.financial_ensure_account(
    'user_pending:'||p_user_id::text||':'||v_t.currency,
    'user_pending_liability',p_user_id,v_t.currency
  );
  v_platform_account := public.financial_ensure_account(
    'platform_pending_revenue:'||v_t.currency,
    'platform_pending_revenue',null,v_t.currency
  );

  insert into public.financial_journal_entries(
    reference,entry_type,status,currency,description,source_type,source_id,metadata
  )
  values(
    'verification-reserve:'||p_submission_id::text,
    'task_verification_reserve','POSTED',v_t.currency,
    'Reserva de orçamento para conclusão ainda não aprovada',
    'task_verification',v_existing.id::text,
    jsonb_build_object('task_id',p_task_id,'submission_id',p_submission_id)
  )
  returning id into v_entry;

  insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
  values
    (v_entry,v_budget_account,'DEBIT',v_net,v_t.currency),
    (v_entry,v_user_account,'CREDIT',v_user,v_t.currency),
    (v_entry,v_platform_account,'CREDIT',v_platform,v_t.currency);

  update public.financial_task_conversions
  set original_journal_entry_id=v_entry, updated_at=now()
  where id=v_existing.id;

  return (select c from public.financial_task_conversions c where c.id=v_existing.id);
end;
$$;

revoke all on function public.recognize_task_conversion_for_submission(uuid,uuid,uuid,text,text,text,text) from public, anon;
grant execute on function public.recognize_task_conversion_for_submission(uuid,uuid,uuid,text,text,text,text) to authenticated;

create or replace function public.process_task_verification_result(
  p_verification_id uuid,
  p_result text,
  p_reason text default null,
  p_provider_result jsonb default '{}'::jsonb
)
returns public.task_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_v public.task_verifications%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_result not in ('APPROVED','REJECTED','PENDING','REVIEW') then raise exception 'invalid verification result'; end if;

  select * into v_v from public.task_verifications where id=p_verification_id for update;
  if v_v.id is null then raise exception 'verification not found'; end if;
  if v_v.status in ('APPROVED','REJECTED') then return v_v; end if;

  if p_result='APPROVED' then
    v_v := public.approve_task_verification(v_v.id,p_reason);
    update public.task_verifications
    set provider_result=coalesce(p_provider_result,'{}'::jsonb),updated_at=now()
    where id=v_v.id returning * into v_v;
  elsif p_result='REJECTED' then
    v_v := public.reject_task_verification(v_v.id,coalesce(p_reason,'Rejected by verification source'));
    update public.task_verifications
    set provider_result=coalesce(p_provider_result,'{}'::jsonb),updated_at=now()
    where id=v_v.id returning * into v_v;
  else
    update public.task_verifications
    set status=p_result,
        decision_reason=nullif(btrim(p_reason),''),
        provider_result=coalesce(p_provider_result,'{}'::jsonb),
        updated_at=now()
    where id=v_v.id
    returning * into v_v;

    insert into public.task_verification_events(verification_id,event_type,from_status,to_status,actor_id,reason,metadata)
    values(v_v.id,'PROVIDER_OR_AUTOMATIC_RESULT',null,p_result,null,p_reason,coalesce(p_provider_result,'{}'::jsonb));
  end if;

  return v_v;
end;
$$;

revoke all on function public.process_task_verification_result(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.process_task_verification_result(uuid,text,text,jsonb) to service_role;
