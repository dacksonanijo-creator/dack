-- TASKORA NOTIFICATIONS: compact real notification foundation
create table if not exists public.notification_rules (
  rule_key text primary key, name text not null, description text not null,
  category text not null check (category in ('tasks','activity','campaigns','promotions','news','security','transactional')),
  enabled boolean not null default true, internal_enabled boolean not null default true,
  push_enabled boolean not null default false, email_enabled boolean not null default false,
  critical boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, message text not null, type text not null,
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  route text, metadata jsonb not null default '{}'::jsonb, source_event_id text, source_event_type text,
  created_at timestamptz not null default now(), read_at timestamptz,
  unique(user_id,source_event_id)
);
create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique, subscription jsonb not null, user_agent text,
  active boolean not null default true, last_seen_at timestamptz not null default now(),
  invalidated_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('tasks','activity','campaigns','promotions','news','security','transactional')),
  in_app boolean not null default true, push boolean not null default true, email boolean not null default true,
  updated_at timestamptz not null default now(), primary key(user_id,category)
);
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(), name text not null unique, title text not null,
  message text not null, type text not null, channel text not null default 'taskora', active boolean not null default true,
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(), name text not null, title text not null, message text not null,
  type text not null, priority text not null default 'normal' check(priority in ('normal','important','urgent')),
  audience_type text not null check(audience_type in ('all','selected','segment','admins')),
  audience_filter jsonb not null default '{}'::jsonb, selected_user_ids uuid[] not null default '{}',
  channels text[] not null default array['taskora'], route text,
  status text not null default 'draft' check(status in ('draft','scheduled','processing','sent','cancelled','error')),
  scheduled_for timestamptz, created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  sent_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(), notification_id uuid references public.notifications(id) on delete cascade,
  campaign_id uuid references public.notification_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check(channel in ('taskora','push','email')),
  status text not null default 'pending' check(status in ('pending','sent','delivered','read','failed')),
  provider_ref text, error_message text, attempts integer not null default 0,
  next_retry_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(notification_id,channel)
);
create table if not exists public.notification_send_log (
  id uuid primary key default gen_random_uuid(), campaign_id uuid references public.notification_campaigns(id) on delete set null,
  notification_id uuid references public.notifications(id) on delete set null, admin_user_id uuid references auth.users(id) on delete set null,
  action text not null, result text not null default 'success', recipient_count integer not null default 0,
  sent_count integer not null default 0, delivered_count integer not null default 0, read_count integer not null default 0,
  failed_count integer not null default 0, channels text[] not null default '{}', created_at timestamptz not null default now()
);

alter table public.notification_rules enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_devices enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_campaigns enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_send_log enable row level security;

grant select,update on public.notifications to authenticated;
grant select,insert,update,delete on public.notification_devices,public.notification_preferences to authenticated;
grant select,insert,update,delete on public.notification_rules,public.notification_templates,public.notification_campaigns,public.notification_deliveries to authenticated;
grant select,insert on public.notification_send_log to authenticated;

create policy notification_user_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notification_user_mark_read on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notification_device_owner on public.notification_devices for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notification_preferences_owner on public.notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notification_admin_rules on public.notification_rules for all to authenticated using(public.is_taskora_admin()) with check(public.is_taskora_admin());
create policy notification_admin_templates on public.notification_templates for all to authenticated using(public.is_taskora_admin()) with check(public.is_taskora_admin());
create policy notification_admin_campaigns on public.notification_campaigns for all to authenticated using(public.is_taskora_admin()) with check(public.is_taskora_admin());
create policy notification_admin_deliveries on public.notification_deliveries for all to authenticated using(public.is_taskora_admin()) with check(public.is_taskora_admin());
create policy notification_admin_send_log on public.notification_send_log for select to authenticated using(public.is_taskora_admin());

insert into public.notification_rules(rule_key,name,description,category,enabled,internal_enabled,push_enabled,email_enabled,critical) values
('task_available','Nova tarefa disponível','Notifica quando uma nova tarefa elegível fica disponível.','tasks',true,true,true,false,false),
('task_started','Tarefa iniciada','Notifica o início de uma tarefa.','activity',true,true,true,false,false),
('task_completed','Tarefa concluída','Notifica quando a tarefa é concluída.','activity',true,true,true,false,false),
('task_approved','Tarefa aprovada','Notifica a aprovação e recompensa.','tasks',true,true,true,true,false),
('task_rejected','Tarefa rejeitada','Notifica a rejeição de uma submissão.','tasks',true,true,true,true,false),
('reward_added','Recompensa adicionada','Notifica crédito de recompensa.','transactional',true,true,true,true,false),
('balance_available','Saldo disponibilizado','Notifica quando saldo fica disponível.','transactional',true,true,true,false,false),
('withdrawal_requested','Levantamento solicitado','Confirma a solicitação de levantamento.','transactional',true,true,true,true,false),
('withdrawal_processing','Levantamento em processamento','Actualiza o estado do levantamento.','transactional',true,true,true,true,false),
('withdrawal_completed','Levantamento concluído','Notifica levantamento concluído.','transactional',true,true,true,true,false),
('withdrawal_rejected','Levantamento rejeitado','Notifica levantamento rejeitado.','transactional',true,true,true,true,false),
('password_changed','Palavra-passe alterada','Alerta de alteração de palavra-passe.','security',true,true,true,true,true),
('contact_changed','Contacto alterado','Alerta de alteração de email ou telefone.','security',true,true,true,true,true),
('new_login','Novo acesso','Alerta de novo acesso.','security',true,true,true,true,true),
('suspicious_activity','Actividade suspeita','Alerta de actividade de segurança suspeita.','security',true,true,true,true,true),
('account_blocked','Conta bloqueada','Alerta de bloqueio da conta.','security',true,true,true,true,true),
('admin_message','Comunicação administrativa','Comunicação enviada pelo painel.','news',true,true,true,true,false)
on conflict(rule_key) do nothing;

create index if not exists idx_notifications_user_date on public.notifications(user_id,created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id,read_at,created_at desc);
create index if not exists idx_notification_deliveries_status on public.notification_deliveries(status,next_retry_at);
create index if not exists idx_notification_campaigns_schedule on public.notification_campaigns(status,scheduled_for);

create or replace function public.create_taskora_notification(
 p_user_id uuid,p_rule_key text,p_title text,p_message text,p_priority text default 'normal',
 p_route text default null,p_metadata jsonb default '{}'::jsonb,p_source_event_id text default null,p_source_event_type text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_rule public.notification_rules%rowtype; v_pref public.notification_preferences%rowtype;
begin
 select * into v_rule from public.notification_rules where rule_key=p_rule_key;
 if not found or not v_rule.enabled or not v_rule.internal_enabled then return null; end if;
 select * into v_pref from public.notification_preferences where user_id=p_user_id and category=v_rule.category;
 insert into public.notifications(user_id,title,message,type,priority,route,metadata,source_event_id,source_event_type)
 values(p_user_id,p_title,p_message,p_rule_key,p_priority,p_route,coalesce(p_metadata,'{}'::jsonb),p_source_event_id,p_source_event_type)
 on conflict(user_id,source_event_id) do nothing returning id into v_id;
 if v_id is not null then
   insert into public.notification_deliveries(notification_id,user_id,channel,status) values(v_id,p_user_id,'taskora','delivered') on conflict do nothing;
   if v_rule.push_enabled and (v_rule.critical or coalesce(v_pref.push,true)) then
     insert into public.notification_deliveries(notification_id,user_id,channel,status) values(v_id,p_user_id,'push','pending') on conflict do nothing;
   end if;
   if v_rule.email_enabled and (v_rule.critical or coalesce(v_pref.email,true)) then
     insert into public.notification_deliveries(notification_id,user_id,channel,status) values(v_id,p_user_id,'email','pending') on conflict do nothing;
   end if;
 end if;
 return v_id;
end; $$;
grant execute on function public.create_taskora_notification(uuid,text,text,text,text,text,jsonb,text,text) to authenticated;

create or replace function public.mark_all_notifications_read() returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer; begin update public.notifications set read_at=now() where user_id=auth.uid() and read_at is null; get diagnostics v_count=row_count; return v_count; end; $$;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function public.set_notification_preference(p_category text,p_in_app boolean,p_push boolean,p_email boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 insert into public.notification_preferences(user_id,category,in_app,push,email) values(auth.uid(),p_category,p_in_app,p_push,p_email)
 on conflict(user_id,category) do update set in_app=excluded.in_app,push=excluded.push,email=excluded.email,updated_at=now();
end; $$;
grant execute on function public.set_notification_preference(text,boolean,boolean,boolean) to authenticated;

create or replace function public.notify_task_submission_change() returns trigger language plpgsql security definer set search_path=public as $$
declare v_rule text; v_title text; v_message text;
begin
 if TG_OP='INSERT' then
  perform public.create_taskora_notification(NEW.user_id,'task_started','Tarefa iniciada','A sua tarefa foi iniciada.','normal','/app/tasks/'||NEW.task_id,'{}'::jsonb,NEW.id::text||':started','task_submission');
 elsif NEW.status is distinct from OLD.status then
  if NEW.status='approved' then v_rule:='task_approved';v_title:='Tarefa aprovada';v_message:='A sua tarefa foi aprovada e a recompensa foi adicionada ao seu saldo.';
  elsif NEW.status='rejected' then v_rule:='task_rejected';v_title:='Tarefa rejeitada';v_message:='A sua submissão de tarefa foi rejeitada.';
  else return NEW; end if;
  perform public.create_taskora_notification(NEW.user_id,v_rule,v_title,v_message,'important','/app/tasks/'||NEW.task_id,jsonb_build_object('submission_id',NEW.id,'reward_amount',NEW.reward_amount),NEW.id::text||':'||NEW.status,'task_submission');
 end if; return NEW; end; $$;
drop trigger if exists trg_taskora_notification_submission on public.task_submissions;
create trigger trg_taskora_notification_submission after insert or update of status on public.task_submissions for each row execute function public.notify_task_submission_change();

create or replace function public.notify_withdrawal_change() returns trigger language plpgsql security definer set search_path=public as $$
declare v_rule text;v_title text;v_message text;
begin
 if TG_OP='INSERT' then v_rule:='withdrawal_requested';v_title:='Levantamento solicitado';v_message:='O seu pedido de levantamento foi recebido.';
 elsif NEW.status is distinct from OLD.status then
  if NEW.status='approved' then v_rule:='withdrawal_processing';v_title:='Levantamento em processamento';v_message:='O seu levantamento está em processamento.';
  elsif NEW.status='paid' then v_rule:='withdrawal_completed';v_title:='Levantamento concluído';v_message:='O seu levantamento foi concluído.';
  elsif NEW.status='rejected' then v_rule:='withdrawal_rejected';v_title:='Levantamento rejeitado';v_message:=coalesce('O seu levantamento foi rejeitado. '||NEW.failure_reason,'O seu levantamento foi rejeitado.');
  else return NEW; end if;
 else return NEW; end if;
 perform public.create_taskora_notification(NEW.user_id,v_rule,v_title,v_message,'important','/app/withdrawals',jsonb_build_object('withdrawal_id',NEW.id,'amount',NEW.amount,'currency',NEW.currency),NEW.id::text||':'||v_rule,'withdrawal');
 return NEW; end; $$;
drop trigger if exists trg_taskora_notification_withdrawal on public.withdrawals;
create trigger trg_taskora_notification_withdrawal after insert or update of status on public.withdrawals for each row execute function public.notify_withdrawal_change();

create or replace function public.notify_transaction_credit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if NEW.type in ('credit','reward') then
  perform public.create_taskora_notification(NEW.user_id,'reward_added','Recompensa adicionada',coalesce(NEW.description,'Uma recompensa foi adicionada ao seu saldo.'),'normal','/app/wallet',jsonb_build_object('transaction_id',NEW.id,'amount',NEW.amount,'currency',NEW.currency),NEW.id::text||':reward','transaction');
 end if; return NEW; end; $$;
drop trigger if exists trg_taskora_notification_transaction on public.transactions;
create trigger trg_taskora_notification_transaction after insert on public.transactions for each row execute function public.notify_transaction_credit();

create or replace function public.admin_send_notification(
 p_title text,p_message text,p_type text,p_priority text,p_channels text[],p_audience_type text,
 p_selected_user_ids uuid[] default '{}',p_route text default null,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid;n uuid;users uuid[];created_count integer:=0; ch text;
begin
 if auth.uid() is null or not public.is_taskora_admin() then raise exception 'not authorized'; end if;
 if length(trim(coalesce(p_title,'')))=0 or length(p_title)>180 or length(trim(coalesce(p_message,'')))=0 or length(p_message)>5000 then raise exception 'invalid message'; end if;
 if p_priority not in ('normal','important','urgent') or p_audience_type not in ('all','selected','admins') then raise exception 'invalid notification parameters'; end if;
 if p_audience_type='selected' then users:=coalesce(p_selected_user_ids,'{}');
 elsif p_audience_type='admins' then select coalesce(array_agg(id),'{}') into users from auth.users where public.is_taskora_admin_user(id);
 else select coalesce(array_agg(id),'{}') into users from auth.users; end if;
 foreach uid in array users loop
  n:=public.create_taskora_notification(uid,'admin_message',p_title,p_message,p_priority,p_route,p_metadata,null,'admin_message');
  if n is not null then
   created_count:=created_count+1;
   if 'push'=any(p_channels) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(n,uid,'push','pending') on conflict do nothing; end if;
   if 'email'=any(p_channels) then insert into public.notification_deliveries(notification_id,user_id,channel,status) values(n,uid,'email','pending') on conflict do nothing; end if;
  end if;
 end loop;
 insert into public.notification_send_log(admin_user_id,action,result,recipient_count,sent_count,channels) values(auth.uid(),'manual_send','success',coalesce(array_length(users,1),0),created_count,p_channels);
 perform public.write_security_audit('notification_send','notificacoes','manual',null,'success',jsonb_build_object('recipient_count',coalesce(array_length(users,1),0),'channels',p_channels));
 return jsonb_build_object('recipient_count',coalesce(array_length(users,1),0),'created_count',created_count);
end; $$;
grant execute on function public.admin_send_notification(text,text,text,text,text[],text,uuid[],text,jsonb) to authenticated;

create or replace function public.is_taskora_admin_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from auth.users u where u.id=p_user_id and lower(coalesce(u.email,'')) in ('dackson144@gmail.com','dacksonanijo@gmail.com'));
$$;
revoke all on function public.is_taskora_admin_user(uuid) from public;
grant execute on function public.is_taskora_admin_user(uuid) to authenticated;

create or replace function public.process_due_notification_campaigns()
returns integer language plpgsql security definer set search_path=public as $$
declare c record;uid uuid;n uuid;created_count integer:=0;
begin
 for c in select * from public.notification_campaigns where status='scheduled' and scheduled_for<=now() order by scheduled_for for update skip locked loop
  update public.notification_campaigns set status='processing',updated_at=now() where id=c.id;
  if c.audience_type='selected' then
   foreach uid in array c.selected_user_ids loop
    n:=public.create_taskora_notification(uid,'admin_message',c.title,c.message,c.priority,c.route,jsonb_build_object('campaign_id',c.id),'campaign:'||c.id::text||':'||uid::text,'campaign');
    if n is not null then created_count:=created_count+1; end if;
   end loop;
  elsif c.audience_type='admins' then
   for uid in select id from auth.users where public.is_taskora_admin_user(id) loop
    n:=public.create_taskora_notification(uid,'admin_message',c.title,c.message,c.priority,c.route,jsonb_build_object('campaign_id',c.id),'campaign:'||c.id::text||':'||uid::text,'campaign');
    if n is not null then created_count:=created_count+1; end if;
   end loop;
  else
   for uid in select id from auth.users loop
    n:=public.create_taskora_notification(uid,'admin_message',c.title,c.message,c.priority,c.route,jsonb_build_object('campaign_id',c.id),'campaign:'||c.id::text||':'||uid::text,'campaign');
    if n is not null then created_count:=created_count+1; end if;
   end loop;
  end if;
  update public.notification_campaigns set status='sent',sent_at=now(),updated_at=now() where id=c.id;
 end loop; return created_count;
end; $$;
grant execute on function public.process_due_notification_campaigns() to authenticated;
