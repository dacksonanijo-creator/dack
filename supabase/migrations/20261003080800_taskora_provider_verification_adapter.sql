-- TASKORA VERIFICATION: provider/API conversions can enter the same engine without a local submission

alter table public.task_verifications
  alter column submission_id drop not null;

create or replace function public.register_provider_task_conversion(
  p_task_id uuid,
  p_user_id uuid,
  p_provider text,
  p_provider_transaction_id text,
  p_conversion_id text,
  p_event_id text,
  p_signature_verified boolean,
  p_gross_amount numeric,
  p_provider_fees numeric,
  p_adjustments numeric,
  p_distributable_amount numeric,
  p_currency text,
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
  v_task public.tasks%rowtype;
  v_existing public.task_verifications%rowtype;
  v_conversion public.financial_task_conversions%rowtype;
  v_verification public.task_verifications%rowtype;
  v_idempotency text;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_signature_verified is not true then raise exception 'provider signature/authenticity must be verified'; end if;
  if p_result not in ('APPROVED','REJECTED','PENDING','REVIEW') then raise exception 'invalid verification result'; end if;

  select * into v_task from public.tasks where id=p_task_id for update;
  if v_task.id is null then raise exception 'task not found'; end if;
  if v_task.external_source is null and v_task.partner_api_id is null then
    raise exception 'task is not configured as provider task';
  end if;

  select * into v_existing
  from public.task_verifications
  where conversion_id=p_conversion_id
     or (provider=p_provider and provider_result->>'event_id'=p_event_id)
  limit 1;
  if v_existing.id is not null then return v_existing; end if;

  v_idempotency := 'provider:'||p_provider||':'||coalesce(p_event_id,p_provider_transaction_id,p_conversion_id);

  v_conversion := public.recognize_task_conversion(
    p_task_id,p_conversion_id,p_user_id,p_provider,p_provider_transaction_id,
    p_provider_transaction_id,v_idempotency,p_gross_amount,p_provider_fees,
    p_adjustments,0,p_distributable_amount,p_currency,null,null,null,null,
    coalesce(p_provider_result,'{}'::jsonb)
  );

  insert into public.task_verifications(
    submission_id,task_id,user_id,origin,verification_type,provider,conversion_id,
    value,currency,evidence,rules_snapshot,provider_result,status,decision_reason
  )
  values(
    null,p_task_id,p_user_id,'provider',coalesce(v_task.verification_method,'external_event'),
    p_provider,p_conversion_id,p_distributable_amount,p_currency,'{}'::jsonb,
    coalesce(v_task.verification_rules,'{}'::jsonb),
    jsonb_build_object('event_id',p_event_id,'provider_result',coalesce(p_provider_result,'{}'::jsonb)),
    p_result,nullif(btrim(p_reason),'')
  )
  returning * into v_verification;

  if p_result='APPROVED' then
    v_conversion := public.make_task_conversion_available(p_conversion_id);
  elsif p_result='REJECTED' then
    v_conversion := public.reverse_task_conversion(p_conversion_id,coalesce(p_reason,'Provider rejected conversion'));
  end if;

  insert into public.task_verification_events(verification_id,event_type,from_status,to_status,actor_id,reason,metadata)
  values(v_verification.id,'PROVIDER_EVENT',null,p_result,null,p_reason,
    jsonb_build_object('provider',p_provider,'transaction_id',p_provider_transaction_id,'event_id',p_event_id));

  if p_result='APPROVED' then
    update public.task_verifications
    set financial_conversion_id=v_conversion.id, status='APPROVED', reviewed_at=now(), updated_at=now()
    where id=v_verification.id returning * into v_verification;
    perform public.create_taskora_notification(
      p_user_id,'task_approved','Tarefa aprovada',
      'A sua tarefa foi verificada e aprovada. A recompensa foi adicionada ao seu saldo disponível.',
      'important','/app/wallet',jsonb_build_object('verification_id',v_verification.id,'conversion_id',p_conversion_id),
      'verification:'||v_verification.id::text,'task_verification','task_approved'
    );
  elsif p_result='REJECTED' then
    update public.task_verifications set status='REJECTED',updated_at=now() where id=v_verification.id returning * into v_verification;
    perform public.create_taskora_notification(
      p_user_id,'task_rejected','Tarefa não aprovada',
      'A sua conclusão não foi aprovada. Consulte os detalhes da tarefa.',
      'important','/app/tasks',jsonb_build_object('verification_id',v_verification.id,'reason',p_reason),
      'verification:'||v_verification.id::text,'task_verification','task_rejected'
    );
  end if;

  return v_verification;
end;
$$;

revoke all on function public.register_provider_task_conversion(uuid,uuid,text,text,text,text,boolean,numeric,numeric,numeric,numeric,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.register_provider_task_conversion(uuid,uuid,text,text,text,text,numeric,numeric,numeric,numeric,text,text,text,jsonb) to service_role;
