-- TASKORA VERIFICATION: return internal task budget on rejection

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
  v_c public.financial_task_conversions%rowtype;
  v_user_account uuid;
  v_platform_account uuid;
  v_budget_account uuid;
  v_provider_account uuid;
  v_entry uuid;
begin
  if auth.role() <> 'service_role' and not public.is_taskora_admin() then raise exception 'not authorized'; end if;
  if p_reason is null or btrim(p_reason)='' then raise exception 'rejection reason is required'; end if;

  select * into v_v from public.task_verifications where id=p_verification_id for update;
  if v_v.id is null then raise exception 'verification not found'; end if;
  if v_v.status='REJECTED' then return v_v; end if;
  if v_v.status='APPROVED' then raise exception 'approved verification cannot be rejected'; end if;

  select * into v_c from public.financial_task_conversions where conversion_id=v_v.conversion_id for update;
  if v_c.id is null then raise exception 'financial conversion not found'; end if;

  if v_v.origin in ('company','admin') then
    v_user_account := public.financial_ensure_account(
      'user_pending:'||v_c.user_id::text||':'||v_c.currency,'user_pending_liability',v_c.user_id,v_c.currency
    );
    v_platform_account := public.financial_ensure_account(
      'platform_pending_revenue:'||v_c.currency,'platform_pending_revenue',null,v_c.currency
    );
    v_budget_account := public.financial_ensure_account(
      'task_budget:'||v_v.task_id::text||':'||v_c.currency,'task_budget_reserve',null,v_c.currency
    );

    insert into public.financial_journal_entries(
      reference,entry_type,status,currency,description,source_type,source_id,metadata
    )
    values(
      'verification-rejection:'||v_v.id::text,'task_verification_rejection','REVERSED',v_c.currency,
      'Libertação da reserva de orçamento após rejeição',
      'task_verification',v_v.id::text,jsonb_build_object('reason',p_reason)
    )
    returning id into v_entry;

    insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
    values
      (v_entry,v_user_account,'DEBIT',v_c.user_amount,v_c.currency),
      (v_entry,v_platform_account,'DEBIT',v_c.taskora_amount,v_c.currency),
      (v_entry,v_budget_account,'CREDIT',v_c.distributable_amount,v_c.currency);

    update public.financial_task_conversions
    set status='REVERSED', reversal_journal_entry_id=v_entry, reversed_at=now(),
        reversal_reason=p_reason, updated_at=now()
    where id=v_c.id;
  else
    perform public.reverse_task_conversion(v_v.conversion_id,p_reason);
  end if;

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
  values(v_v.id,'REJECTION',v_v.status,'REJECTED',auth.uid(),p_reason);

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
