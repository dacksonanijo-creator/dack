-- TASKORA VERIFICATION: protected admin task creation with mandatory budget and verification settings

create or replace function public.create_admin_task(
  p_title text,
  p_description text,
  p_category text,
  p_reward numeric,
  p_currency text,
  p_slots integer,
  p_budget_total numeric,
  p_deadline timestamptz default null,
  p_verification_method text default 'manual',
  p_verification_rules jsonb default '{}'::jsonb
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare v_task public.tasks%rowtype;
begin
  if not public.is_taskora_admin() then raise exception 'not authorized'; end if;
  if nullif(btrim(p_title),'') is null or nullif(btrim(p_description),'') is null then raise exception 'title and description are required'; end if;
  if p_reward <= 0 or p_slots < 1 or p_budget_total < p_reward * p_slots then
    raise exception 'budget must cover all planned task rewards';
  end if;
  if p_currency is null or btrim(p_currency)='' then raise exception 'currency is required'; end if;
  if p_verification_method not in ('manual','automatic','code','external_event','automatic_manual_review') then
    raise exception 'invalid verification method';
  end if;

  insert into public.tasks(
    company_id,title,description,category,reward,slots,slots_filled,deadline,status,
    external_source,external_id,origin,currency,budget_total,verification_method,verification_rules
  )
  values(
    null,btrim(p_title),btrim(p_description),coalesce(nullif(btrim(p_category),''),'general'),
    round(p_reward,2),p_slots,0,p_deadline,'active',null,null,'admin',upper(p_currency),
    round(p_budget_total,2),p_verification_method,coalesce(p_verification_rules,'{}'::jsonb)
  )
  returning * into v_task;

  perform public.write_security_audit(
    'admin_task_created','tasks',v_task.id::text,'success',
    jsonb_build_object('reward',v_task.reward,'currency',v_task.currency,'slots',v_task.slots,'budget_total',v_task.budget_total,'verification_method',v_task.verification_method)
  );

  return v_task;
end;
$$;

revoke all on function public.create_admin_task(text,text,text,numeric,text,integer,numeric,timestamptz,text,jsonb) from public, anon;
grant execute on function public.create_admin_task(text,text,text,numeric,text,integer,numeric,timestamptz,text,jsonb) to authenticated;
