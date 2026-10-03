create or replace function public.admin_search_notification_users(p_query text default '',p_limit integer default 20)
returns table(id uuid,email text,full_name text,phone text)
language sql stable security definer set search_path=public as $$
 select u.id,u.email,p.full_name,p.phone
 from auth.users u left join public.profiles p on p.id=u.id
 where public.is_taskora_admin()
   and (coalesce(trim(p_query),'')='' or lower(coalesce(u.email,'')) like '%'||lower(trim(p_query))||'%' or lower(coalesce(p.full_name,'')) like '%'||lower(trim(p_query))||'%' or coalesce(p.phone,'') like '%'||trim(p_query)||'%')
 order by coalesce(p.full_name,u.email) limit least(greatest(p_limit,1),50)
$$;
revoke all on function public.admin_search_notification_users(text,integer) from public;
grant execute on function public.admin_search_notification_users(text,integer) to authenticated;