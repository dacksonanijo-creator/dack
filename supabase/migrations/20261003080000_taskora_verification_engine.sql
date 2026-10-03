-- TASKORA: centralized verification engine and financial release gate
-- One engine for company tasks, admin tasks and external-provider tasks.

alter table public.tasks
  add column if not exists origin text,
  add column if not exists budget_total numeric(20,2),
  add column if not exists budget_reserved numeric(20,2) not null default 0,
  add column if not exists budget_approved numeric(20,2) not null default 0,
  add column if not exists budget_paid numeric(20,2) not null default 0,
  add column if not exists verification_method text not null default 'manual',
  add column if not exists verification_rules jsonb not null default '{}'::jsonb;

alter table public.tasks
  add constraint tasks_budget_nonnegative check (
    (budget_total is null or budget_total >= 0)
    and budget_reserved >= 0
    and budget_approved >= 0
    and budget_paid >= 0
  );

create table if not exists public.task_verifications (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.task_submissions(id) on delete restrict,
  task_id uuid not null references public.tasks(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  origin text not null check (origin in ('company','admin','provider')),
  verification_type text not null,
  provider text,
  conversion_id text unique,
  value numeric(20,2) not null check (value >= 0),
  currency text not null default 'MZN',
  evidence jsonb not null default '{}'::jsonb,
  rules_snapshot jsonb not null default '{}'::jsonb,
  provider_result jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','REVIEW')),
  decision_reason text,
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  financial_conversion_id uuid references public.financial_task_conversions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_verifications_status_date
  on public.task_verifications(status, created_at desc);

create index if not exists task_verifications_task_user
  on public.task_verifications(task_id, user_id);

alter table public.task_verifications enable row level security;

revoke all on public.task_verifications from anon, authenticated;
grant select on public.task_verifications to authenticated;

create policy task_verifications_owner_or_admin
on public.task_verifications
for select to authenticated
using (public.is_taskora_admin() or user_id = auth.uid());

create table if not exists public.task_verification_events (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.task_verifications(id) on delete restrict,
  event_type text not null,
  from_status text,
  to_status text,
  actor_id uuid references auth.users(id),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.task_verification_events enable row level security;
revoke all on public.task_verification_events from anon, authenticated;
grant select on public.task_verification_events to authenticated;

create policy task_verification_events_owner_or_admin
on public.task_verification_events
for select to authenticated
using (
  public.is_taskora_admin()
  or exists (
    select 1 from public.task_verifications v
    where v.id = verification_id and v.user_id = auth.uid()
  )
);

create or replace function public.submit_task_for_verification(
  p_task_id uuid,
  p_proof text default null,
  p_evidence jsonb default '{}'::jsonb
)
returns public.task_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
  v_submission public.task_submissions%rowtype;
  v_verification public.task_verifications%rowtype;
  v_conversion public.financial_task_conversions%rowtype;
  v_origin text;
  v_conversion_id text;
  v_rule public.financial_distribution_rules%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_task
  from public.tasks
  where id=p_task_id
  for update;

  if v_task.id is null then raise exception 'task not found'; end if;
  if v_task.status <> 'active' then raise exception 'task is not active'; end if;
  if v_task.deadline is not null and v_task.deadline < now() then raise exception 'task deadline has passed'; end if;
  if v_task.reward <= 0 then raise exception 'task reward is not configured'; end if;
  if v_task.slots_filled >= v_task.slots then raise exception 'no task slots available'; end if;

  if v_task.budget_total is null then
    raise exception 'task budget is not configured';
  end if;

  if v_task.budget_reserved + v_task.reward > v_task.budget_total then
    raise exception 'insufficient task budget';
  end if;

  if exists (
    select 1 from public.task_submissions
    where task_id=p_task_id and user_id=auth.uid()
  ) then
    raise exception 'task already submitted by this user';
  end if;

  v_origin := case
    when v_task.external_source is not null or v_task.partner_api_id is not null then 'provider'
    when v_task.company_id is not null then 'company'
    else 'admin'
  end;

  insert into public.task_submissions(task_id,user_id,proof,status,reward_amount)
  values(p_task_id,auth.uid(),p_proof,'pending',v_task.reward)
  returning * into v_submission;

  select * into v_rule from public.financial_distribution_rules
  where active=true order by version desc limit 1;
  if v_rule.id is null then raise exception 'distribution rule not configured'; end if;

  v_conversion_id := 'task-submission:' || v_submission.id::text;

  v_conversion := public.recognize_task_conversion_for_submission(
    v_submission.id, v_task.id, auth.uid(), v_origin, v_task.external_source,
    v_conversion_id, v_task.reward, v_task.currency
  );

  insert into public.task_verifications(
    submission_id,task_id,user_id,origin,verification_type,provider,conversion_id,
    value,currency,evidence,rules_snapshot,provider_result,status
  )
  values(
    v_submission.id,v_task.id,auth.uid(),v_origin,
    coalesce(v_task.verification_method,'manual'),v_task.external_source,v_conversion_id,
    v_task.reward,coalesce(v_task.currency,'MZN'),coalesce(p_evidence,'{}'::jsonb),
    coalesce(v_task.verification_rules,'{}'::jsonb),
    case when v_origin='provider' then jsonb_build_object('source',v_task.external_source,'external_id',v_task.external_id) else null end,
    case when coalesce(v_task.verification_method,'manual')='automatic' then 'PENDING' else 'REVIEW' end
  )
  returning * into v_verification;

  update public.tasks
  set budget_reserved=budget_reserved+v_task.reward,
      slots_filled=slots_filled+1,
      updated_at=now()
  where id=v_task.id;

  insert into public.task_verification_events(verification_id,event_type,from_status,to_status,actor_id,metadata)
  values(v_verification.id,'SUBMITTED',null,v_verification.status,auth.uid(),jsonb_build_object('origin',v_origin));

  return v_verification;
end;
$$;

revoke all on function public.submit_task_for_verification(uuid,text,jsonb) from public, anon;
grant execute on function public.submit_task_for_verification(uuid,text,jsonb) to authenticated;

create or replace function public.approve_task_verification(
  p_verification_id uuid,
  p_reason text default null
)
returns public.task_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_v public.task_verifications%rowtype;
  v_c public.financial_task_conversions%rowtype;
begin
  if auth.role() <> 'service_role' and not public.is_taskora_admin() then raise exception 'not authorized'; end if;

  select * into v_v from public.task_verifications where id=p_verification_id for update;
  if v_v.id is null then raise exception 'verification not found'; end if;
  if v_v.status='APPROVED' then return v_v; end if;
  if v_v.status <> 'PENDING' and v_v.status <> 'REVIEW' then raise exception 'verification cannot be approved from current state'; end if;

  v_c := public.make_task_conversion_available(v_v.conversion_id);

  update public.task_submissions set status='approved', reward_amount=v_v.value, updated_at=now()
  where id=v_v.submission_id;

  update public.tasks
  set budget_reserved=greatest(0,budget_reserved-v_v.value),
      budget_approved=budget_approved+v_v.value,
      updated_at=now()
  where id=v_v.task_id;

  update public.task_verifications
  set status='APPROVED', decision_reason=nullif(btrim(p_reason),''), reviewer_id=auth.uid(), reviewed_at=now(),
      financial_conversion_id=v_c.id, updated_at=now()
  where id=v_v.id
  returning * into v_v;

  insert into public.task_verification_events(verification_id,event_type,from_status,to_status,actor_id,reason)
  values(v_v.id,'MANUAL_OR_ENGINE_APPROVAL',v_v.status,'APPROVED',auth.uid(),p_reason);

  perform public.write_security_audit('task_verification_approved','tasks',v_v.id::text,'success',
    jsonb_build_object('task_id',v_v.task_id,'user_id',v_v.user_id,'value',v_v.value,'conversion_id',v_v.conversion_id));

  perform public.create_taskora_notification(
    v_v.user_id,'task_approved','Tarefa aprovada',
    'A sua tarefa foi verificada e aprovada. A recompensa foi adicionada ao seu saldo disponível.',
    'important','/app/wallet',
    jsonb_build_object('verification_id',v_v.id,'conversion_id',v_v.conversion_id),
    'verification:'||v_v.id::text,'task_verification','task_approved'
  );

  return v_v;
end;
$$;

revoke all on function public.approve_task_verification(uuid,text) from public, anon;
grant execute on function public.approve_task_verification(uuid,text) to authenticated;

create or replace function public.reject_task_verification(
  p_verification_id uuid,
  p_reason text
)
returns public.task_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_v public.task_verifications%rowtype;
begin
  if auth.role() <> 'service_role' and not public.is_taskora_admin() then raise exception 'not authorized'; end if;
  if p_reason is null or btrim(p_reason)='' then raise exception 'rejection reason is required'; end if;

  select * into v_v from public.task_verifications where id=p_verification_id for update;
  if v_v.id is null then raise exception 'verification not found'; end if;
  if v_v.status='REJECTED' then return v_v; end if;
  if v_v.status='APPROVED' then raise exception 'approved verification cannot be rejected'; end if;

  perform public.reverse_task_conversion(v_v.conversion_id,p_reason);

  update public.task_submissions set status='rejected', updated_at=now()
  where id=v_v.submission_id;

  update public.tasks
  set budget_reserved=greatest(0,budget_reserved-v_v.value),
      slots_filled=greatest(0,slots_filled-1),
      updated_at=now()
  where id=v_v.task_id;

  update public.task_verifications
  set status='REJECTED', decision_reason=p_reason, reviewer_id=auth.uid(), reviewed_at=now(), updated_at=now()
  where id=v_v.id
  returning * into v_v;

  insert into public.task_verification_events(verification_id,event_type,from_status,to_status,actor_id,reason)
  values(v_v.id,'MANUAL_REJECTION',v_v.status,'REJECTED',auth.uid(),p_reason);

  perform public.write_security_audit('task_verification_rejected','tasks',v_v.id::text,'success',
    jsonb_build_object('task_id',v_v.task_id,'user_id',v_v.user_id,'value',v_v.value,'reason',p_reason));

  perform public.create_taskora_notification(
    v_v.user_id,'task_rejected','Tarefa não aprovada',
    'A sua conclusão não foi aprovada. Consulte os detalhes da tarefa.',
    'important','/app/tasks',
    jsonb_build_object('verification_id',v_v.id,'reason',p_reason),
    'verification:'||v_v.id::text,'task_verification','task_rejected'
  );

  return v_v;
end;
$$;

revoke all on function public.reject_task_verification(uuid,text) from public, anon;
grant execute on function public.reject_task_verification(uuid,text) to authenticated;

create or replace function public.move_task_verification_to_review(
  p_verification_id uuid,
  p_reason text default null
)
returns public.task_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare v_v public.task_verifications%rowtype;
begin
  if not public.is_taskora_admin() then raise exception 'not authorized'; end if;
  select * into v_v from public.task_verifications where id=p_verification_id for update;
  if v_v.id is null then raise exception 'verification not found'; end if;
  if v_v.status not in ('PENDING','REVIEW') then raise exception 'invalid verification state'; end if;
  update public.task_verifications set status='REVIEW',decision_reason=p_reason,updated_at=now()
  where id=v_v.id returning * into v_v;
  insert into public.task_verification_events(verification_id,event_type,from_status,to_status,actor_id,reason)
  values(v_v.id,'REVIEW_REQUESTED',v_v.status,'REVIEW',auth.uid(),p_reason);
  return v_v;
end;
$$;

revoke all on function public.move_task_verification_to_review(uuid,text) from public, anon;
grant execute on function public.move_task_verification_to_review(uuid,text) to authenticated;

create or replace function public.get_pending_task_verifications()
returns table(
  id uuid, task_id uuid, submission_id uuid, user_id uuid, origin text,
  verification_type text, provider text, value numeric, currency text,
  status text, decision_reason text, created_at timestamptz
)
language sql stable security invoker
as $$
  select id,task_id,submission_id,user_id,origin,verification_type,provider,value,currency,status,decision_reason,created_at
  from public.task_verifications
  where public.is_taskora_admin() and status in ('PENDING','REVIEW')
  order by created_at asc
$$;

grant execute on function public.get_pending_task_verifications() to authenticated;

-- Trusted backend helper: obtains the task's reward; clients never provide a financial amount.
create or replace function public.recognize_task_conversion_for_submission(
  p_submission_id uuid,
  p_task_id uuid,
  p_user_id uuid,
  p_provider text,
  p_provider_source text,
  p_conversion_id text,
  p_amount numeric,
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
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_s from public.task_submissions where id=p_submission_id and user_id=auth.uid() for update;
  if v_s.id is null then raise exception 'submission not found'; end if;
  select * into v_t from public.tasks where id=p_task_id for update;
  if v_t.id is null or v_t.id<>v_s.task_id then raise exception 'task mismatch'; end if;

  if p_amount <> v_t.reward then raise exception 'client amount does not match task reward'; end if;
  v_net := round(v_t.reward,2);

  select * into v_existing from public.financial_task_conversions where conversion_id=p_conversion_id;
  if v_existing.id is not null then return v_existing; end if;

  select * into v_rule from public.financial_distribution_rules where active=true order by version desc limit 1 for update;
  if v_rule.id is null then raise exception 'distribution rule not configured'; end if;

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
    v_rule.taskora_percent,v_rule.user_percent,v_platform,v_user,coalesce(p_currency,'MZN'),'PENDING',
    v_rule.id,jsonb_build_object('source','task_submission','submission_id',p_submission_id)
  )
  returning * into v_existing;

  return v_existing;
end;
$$;

revoke all on function public.recognize_task_conversion_for_submission(uuid,uuid,uuid,text,text,text,numeric,text) from public, anon;
grant execute on function public.recognize_task_conversion_for_submission(uuid,uuid,uuid,text,text,text,numeric,text) to authenticated;

create or replace function public.update_taskora_verification_timestamp()
returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at=now(); return new; end $$;

drop trigger if exists task_verifications_updated on public.task_verifications;
create trigger task_verifications_updated before update on public.task_verifications
for each row execute function public.update_taskora_verification_timestamp();

-- Replace the earlier broad submission-update policy: users may only submit/update proof while pending;
-- financial status transitions belong to the verification engine.
drop policy if exists "Users update own pending submissions" on public.task_submissions;
create policy "Users update own pending submissions"
on public.task_submissions for update to authenticated
using (auth.uid()=user_id and status='pending')
with check (auth.uid()=user_id and status='pending');
