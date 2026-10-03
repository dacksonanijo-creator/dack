-- TASKORA SECURITY: administrative security foundations
-- No credentials, tokens, passwords or API secrets are stored by these tables.

create or replace function public.is_taskora_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'dackson144@gmail.com',
    'dacksonanijo@gmail.com'
  );
$$;

revoke all on function public.is_taskora_admin() from public;
grant execute on function public.is_taskora_admin() to authenticated;

create table if not exists public.security_fraud_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  name text not null,
  description text not null,
  enabled boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_suspicious_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'flagged' check (status in ('flagged','reviewed','cleared','blocked')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('login_success','login_failed','account_recovery','authentication_change','password_change','two_factor_enabled','two_factor_disabled')),
  success boolean not null,
  device text,
  browser text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.security_admin_roles (
  role_key text primary key,
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.security_admin_permissions (
  id uuid primary key default gen_random_uuid(),
  role_key text not null references public.security_admin_roles(role_key) on delete cascade,
  area_key text not null,
  allowed boolean not null default true,
  unique (role_key, area_key)
);

create table if not exists public.security_account_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_type text not null check (block_type in ('temporary','permanent')),
  reason text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users(id),
  released_by uuid references auth.users(id),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  check (block_type = 'permanent' or ends_at is not null)
);

create table if not exists public.security_admin_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  device text,
  browser text,
  user_agent text,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz
);

create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  area text not null,
  resource_type text,
  resource_id text,
  result text not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.security_fraud_rules enable row level security;
alter table public.security_suspicious_accounts enable row level security;
alter table public.security_access_events enable row level security;
alter table public.security_admin_roles enable row level security;
alter table public.security_admin_permissions enable row level security;
alter table public.security_account_blocks enable row level security;
alter table public.security_admin_sessions enable row level security;
alter table public.security_alerts enable row level security;
alter table public.security_audit_log enable row level security;

revoke all on public.security_fraud_rules, public.security_suspicious_accounts, public.security_access_events,
  public.security_admin_roles, public.security_admin_permissions, public.security_account_blocks,
  public.security_admin_sessions, public.security_alerts, public.security_audit_log
from anon, authenticated;

grant select, insert, update, delete on public.security_fraud_rules to authenticated;
grant select, insert, update, delete on public.security_suspicious_accounts to authenticated;
grant select, insert on public.security_access_events to authenticated;
grant select on public.security_admin_roles, public.security_admin_permissions to authenticated;
grant select, insert, update on public.security_account_blocks to authenticated;
grant select, insert, update on public.security_admin_sessions to authenticated;
grant select, insert, update on public.security_alerts to authenticated;
grant select, insert on public.security_audit_log to authenticated;

create policy security_admin_fraud_rules on public.security_fraud_rules for all to authenticated
  using (public.is_taskora_admin()) with check (public.is_taskora_admin());
create policy security_admin_suspicious_accounts on public.security_suspicious_accounts for all to authenticated
  using (public.is_taskora_admin()) with check (public.is_taskora_admin());
create policy security_admin_access_events on public.security_access_events for select to authenticated
  using (public.is_taskora_admin());
create policy security_admin_access_events_insert on public.security_access_events for insert to authenticated
  with check (user_id = auth.uid() or public.is_taskora_admin());
create policy security_admin_roles_policy on public.security_admin_roles for select to authenticated
  using (public.is_taskora_admin());
create policy security_admin_permissions_policy on public.security_admin_permissions for select to authenticated
  using (public.is_taskora_admin());
create policy security_admin_blocks on public.security_account_blocks for all to authenticated
  using (public.is_taskora_admin()) with check (public.is_taskora_admin());
create policy security_admin_sessions on public.security_admin_sessions for all to authenticated
  using (user_id = auth.uid() or public.is_taskora_admin())
  with check (user_id = auth.uid() or public.is_taskora_admin());
create policy security_admin_alerts on public.security_alerts for all to authenticated
  using (public.is_taskora_admin()) with check (public.is_taskora_admin());
create policy security_admin_audit on public.security_audit_log for select to authenticated
  using (public.is_taskora_admin());
create policy security_admin_audit_insert on public.security_audit_log for insert to authenticated
  with check (admin_user_id = auth.uid() and public.is_taskora_admin());

insert into public.security_fraud_rules (rule_key, name, description, configuration)
values
 ('multiple_accounts','Múltiplas contas','Sinaliza padrões que podem indicar várias contas relacionadas.','{"threshold":2}'),
 ('abnormal_activity','Actividade anormal','Sinaliza actividade fora dos padrões configurados.','{}'),
 ('repeated_attempts','Tentativas repetidas','Sinaliza repetição anormal de tentativas de acesso ou acções.','{"threshold":5,"window_minutes":15}'),
 ('suspicious_usage','Utilização suspeita','Permite configurar sinais de utilização potencialmente abusiva.','{}'),
 ('incompatible_pattern','Padrão incompatível','Permite configurar combinações de eventos incompatíveis com o comportamento esperado.','{}')
on conflict (rule_key) do nothing;

insert into public.security_admin_roles (role_key,name,description)
values
 ('super_admin','Super Admin','Acesso administrativo completo.'),
 ('admin','Admin','Acesso administrativo conforme permissões atribuídas.'),
 ('moderator','Moderador','Acesso limitado às áreas de moderação.')
on conflict (role_key) do nothing;

create index if not exists idx_security_suspicious_status on public.security_suspicious_accounts(status, created_at desc);
create index if not exists idx_security_access_events_user_date on public.security_access_events(user_id, created_at desc);
create index if not exists idx_security_access_events_type_date on public.security_access_events(event_type, created_at desc);
create index if not exists idx_security_alerts_status_date on public.security_alerts(status, created_at desc);
create index if not exists idx_security_audit_date on public.security_audit_log(created_at desc);
create index if not exists idx_security_sessions_user on public.security_admin_sessions(user_id, last_activity_at desc);

create or replace function public.touch_security_session(p_session_key text, p_device text, p_browser text, p_user_agent text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_taskora_admin() then
    raise exception 'not authorized';
  end if;
  insert into public.security_admin_sessions(session_key,user_id,device,browser,user_agent)
  values(p_session_key,auth.uid(),p_device,p_browser,p_user_agent)
  on conflict(session_key) do update set
    device=excluded.device,
    browser=excluded.browser,
    user_agent=excluded.user_agent,
    last_activity_at=now(),
    revoked_at=null
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.touch_security_session(text,text,text,text) to authenticated;

create or replace function public.revoke_security_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_taskora_admin() then
    raise exception 'not authorized';
  end if;
  update public.security_admin_sessions set revoked_at=now() where id=p_session_id;
end;
$$;

grant execute on function public.revoke_security_session(uuid) to authenticated;

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
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_taskora_admin() then
    raise exception 'not authorized';
  end if;
  insert into public.security_audit_log(admin_user_id,action,area,resource_type,resource_id,result,metadata)
  values(auth.uid(),p_action,p_area,p_resource_type,p_resource_id,p_result,p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.write_security_audit(text,text,text,text,text,jsonb) to authenticated;


create or replace function public.log_security_access_event(
  p_event_type text,
  p_success boolean,
  p_device text default null,
  p_browser text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_event_type not in ('login_success','login_failed','account_recovery','authentication_change','password_change','two_factor_enabled','two_factor_disabled') then
    raise exception 'invalid security event';
  end if;
  if p_event_type <> 'login_failed' and auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.security_access_events(user_id,event_type,success,device,browser)
  values(auth.uid(),p_event_type,p_success,p_device,p_browser)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.log_security_access_event(text,boolean,text,text) to anon, authenticated;


-- If an administrator has enrolled MFA, every direct access to security data requires AAL2.
create policy security_mfa_security_fraud_rules on public.security_fraud_rules as restrictive for all to authenticated using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
) with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
);
create policy security_mfa_security_suspicious_accounts on public.security_suspicious_accounts as restrictive for all to authenticated using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
) with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
);
create policy security_mfa_security_access_events on public.security_access_events as restrictive for all to authenticated using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
) with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
);
create policy security_mfa_security_admin_roles on public.security_admin_roles as restrictive for all to authenticated using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
) with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
);
create policy security_mfa_security_admin_permissions on public.security_admin_permissions as restrictive for all to authenticated using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
) with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
);
create policy security_mfa_security_account_blocks on public.security_account_blocks as restrictive for all to authenticated using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
) with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
);
create policy security_mfa_security_admin_sessions on public.security_admin_sessions as restrictive for all to authenticated using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
) with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
);
create policy security_mfa_security_alerts on public.security_alerts as restrictive for all to authenticated using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
) with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
);
create policy security_mfa_security_audit_log on public.security_audit_log as restrictive for all to authenticated using (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
) with check (
  array[(select auth.jwt()->>'aal')] <@ (
    select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end
    from auth.mfa_factors where user_id=(select auth.uid()) and status='verified'
  )
);


create or replace function public.log_security_access_event(
  p_event_type text,
  p_success boolean,
  p_device text default null,
  p_browser text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_failed_count integer;
begin
  if p_event_type not in ('login_success','login_failed','account_recovery','authentication_change','password_change','two_factor_enabled','two_factor_disabled') then
    raise exception 'invalid security event';
  end if;
  if p_event_type <> 'login_failed' and auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.security_access_events(user_id,event_type,success,device,browser)
  values(auth.uid(),p_event_type,p_success,p_device,p_browser)
  returning id into v_id;

  if p_event_type = 'login_failed' then
    select count(*) into v_failed_count
    from public.security_access_events
    where event_type='login_failed'
      and browser is not distinct from p_browser
      and created_at >= now() - interval '15 minutes';

    if v_failed_count >= 5 then
      insert into public.security_alerts(alert_type,severity,title,description,metadata)
      values(
        'repeated_login_failures',
        'high',
        'Várias tentativas de acesso falhadas',
        'Foram registadas várias tentativas de login falhadas no período recente.',
        jsonb_build_object('browser',p_browser,'window_minutes',15,'count',v_failed_count)
      );
    end if;
  end if;

  return v_id;
end;
$$;

grant execute on function public.log_security_access_event(text,boolean,text,text) to anon, authenticated;

create or replace function public.touch_security_session(p_session_key text, p_device text, p_browser text, p_user_agent text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing_count integer;
begin
  if auth.uid() is null or not public.is_taskora_admin() then
    raise exception 'not authorized';
  end if;

  select count(*) into v_existing_count
  from public.security_admin_sessions
  where user_id=auth.uid() and browser is not distinct from p_browser and revoked_at is null;

  insert into public.security_admin_sessions(session_key,user_id,device,browser,user_agent)
  values(p_session_key,auth.uid(),p_device,p_browser,p_user_agent)
  on conflict(session_key) do update set
    device=excluded.device,
    browser=excluded.browser,
    user_agent=excluded.user_agent,
    last_activity_at=now(),
    revoked_at=null
  returning id into v_id;

  if v_existing_count = 0 then
    insert into public.security_alerts(alert_type,severity,user_id,title,description,metadata)
    values(
      'new_admin_device',
      'medium',
      'Novo dispositivo administrativo',
      'Foi registada uma nova sessão administrativa neste dispositivo/navegador.',
      jsonb_build_object('device',p_device,'browser',p_browser)
    );
  end if;

  return v_id;
end;
$$;

grant execute on function public.touch_security_session(text,text,text,text) to authenticated;
