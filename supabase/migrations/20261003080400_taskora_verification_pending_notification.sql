-- TASKORA VERIFICATION: pending notification rule and automatic submission notification

insert into public.notification_rules(rule_key,category,enabled,critical,push_enabled,email_enabled)
values
  ('task_verification_pending','tasks',true,false,false,false)
on conflict (rule_key) do nothing;

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
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_task from public.tasks where id=p_task_id for update;
  if v_task.id is null then raise exception 'task not found'; end if;
  if v_task.status <> 'active' then raise exception 'task is not active'; end if;
  if v_task.deadline is not null and v_task.deadline < now() then raise exception 'task deadline has passed'; end if;
  if v_task.reward <= 0 then raise exception 'task reward is not configured'; end if;
  if v_task.slots_filled >= v_task.slots then raise exception 'no task slots available'; end if;
  if v_task.budget_total is null then raise exception 'task budget is not configured'; end if;
  if v_task.budget_reserved + v_task.reward > v_task.budget_total then raise exception 'insufficient task budget'; end if;
  if exists(select 1 from public.task_submissions where task_id=p_task_id and user_id=auth.uid()) then
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

  v_conversion_id := 'task-submission:'||v_submission.id::text;

  v_conversion := public.recognize_task_conversion_for_submission(
    v_submission.id,v_task.id,auth.uid(),v_origin,v_task.external_source,
    v_conversion_id,coalesce(v_task.currency,'MZN')
  );

  insert into public.task_verifications(
    submission_id,task_id,user_id,origin,verification_type,provider,conversion_id,
    value,currency,evidence,rules_snapshot,provider_result,status
  )
  values(
    v_submission.id,v_task.id,auth.uid(),v_origin,coalesce(v_task.verification_method,'manual'),
    v_task.external_source,v_conversion_id,v_task.reward,coalesce(v_task.currency,'MZN'),
    coalesce(p_evidence,'{}'::jsonb),coalesce(v_task.verification_rules,'{}'::jsonb),
    case when v_origin='provider' then jsonb_build_object('source',v_task.external_source,'external_id',v_task.external_id) else null end,
    case when coalesce(v_task.verification_method,'manual')='automatic' then 'PENDING' else 'REVIEW' end
  )
  returning * into v_verification;

  update public.tasks
  set budget_reserved=budget_reserved+v_task.reward, slots_filled=slots_filled+1, updated_at=now()
  where id=v_task.id;

  insert into public.task_verification_events(verification_id,event_type,from_status,to_status,actor_id,metadata)
  values(v_verification.id,'SUBMITTED',null,v_verification.status,auth.uid(),jsonb_build_object('origin',v_origin));

  perform public.create_taskora_notification(
    auth.uid(),'task_verification_pending','Tarefa em verificação',
    'A sua conclusão foi submetida e está em processo de verificação.',
    'normal','/app/wallet',
    jsonb_build_object('verification_id',v_verification.id,'conversion_id',v_conversion_id),
    'verification:'||v_verification.id::text,'task_verification','task_verification_pending'
  );

  return v_verification;
end;
$$;
