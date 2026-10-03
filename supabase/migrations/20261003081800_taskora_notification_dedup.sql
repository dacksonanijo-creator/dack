-- TASKORA NOTIFICATIONS: deduplicate submission and verification approval events

create or replace function public.notify_task_submission_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_rule text; v_title text; v_message text; v_source text;
begin
  if TG_OP='UPDATE' and NEW.status is distinct from OLD.status then
    if NEW.status='approved' then
      v_rule:='task_approved'; v_title:='Tarefa aprovada';
      v_message:='A sua tarefa foi aprovada e a recompensa foi adicionada ao seu saldo.';
    elsif NEW.status='rejected' then
      v_rule:='task_rejected'; v_title:='Tarefa rejeitada';
      v_message:='A sua submissão de tarefa foi rejeitada.';
    else
      return NEW;
    end if;

    select 'verification:'||v.id::text into v_source
    from public.task_verifications v
    where v.submission_id=NEW.id
    limit 1;

    perform public.create_taskora_notification(
      NEW.user_id,v_rule,v_title,v_message,'important','/app/tasks/'||NEW.task_id,
      jsonb_build_object('submission_id',NEW.id,'reward_amount',NEW.reward_amount),
      coalesce(v_source,NEW.id::text||':'||NEW.status),'task_submission'
    );
  end if;
  return NEW;
end;
$$;
