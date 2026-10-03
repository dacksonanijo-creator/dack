-- TASKORA AUDIT: trusted backend operations may write security audit records
create or replace function public.write_security_audit(
  p_action text,
  p_area text,
  p_resource_type text default null,
  p_resource_id text default null,
  p_result text default 'success',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_actor uuid;
begin
  if auth.role() <> 'service_role' and (auth.uid() is null or not public.is_taskora_admin()) then
    raise exception 'not authorized';
  end if;
  v_actor := case when auth.role() = 'service_role' then null else auth.uid() end;
  insert into public.security_audit_log(admin_user_id,action,area,resource_type,resource_id,result,metadata)
  values(v_actor,p_action,p_area,p_resource_type,p_resource_id,p_result,p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.write_security_audit(text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.write_security_audit(text,text,text,text,text,jsonb) to authenticated, service_role;
