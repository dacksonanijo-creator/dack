-- TASKORA WITHDRAWALS: ledger-backed withdrawal engine
-- No browser/admin UI path can edit a user balance directly.

alter type public.withdrawal_status add value if not exists 'processing';
alter type public.withdrawal_status add value if not exists 'failed';
alter type public.withdrawal_status add value if not exists 'review';
alter type public.withdrawal_status add value if not exists 'cancelled';
alter type public.withdrawal_status add value if not exists 'reversed';

alter table public.withdrawals
  add column if not exists reference text,
  add column if not exists idempotency_key text,
  add column if not exists provider text,
  add column if not exists environment text,
  add column if not exists provider_conversation_id text,
  add column if not exists provider_response_code text,
  add column if not exists failure_reason text,
  add column if not exists rejection_reason text,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists reversed_at timestamptz,
  add column if not exists processed_at timestamptz,
  add column if not exists reviewer_id uuid references auth.users(id),
  add column if not exists processor_id uuid references auth.users(id),
  add column if not exists payout_proof_url text,
  add column if not exists country text;

create unique index if not exists withdrawals_reference_key on public.withdrawals(reference) where reference is not null;
create unique index if not exists withdrawals_user_idem_key on public.withdrawals(user_id, idempotency_key) where idempotency_key is not null;
revoke insert, update, delete on public.withdrawals from authenticated;

create table if not exists public.withdrawal_rules (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'MZ',
  method text not null,
  currency text not null default 'MZN',
  enabled boolean not null default true,
  min_amount numeric(20,2) not null check (min_amount > 0),
  max_amount numeric(20,2) not null check (max_amount >= min_amount),
  daily_limit numeric(20,2),
  weekly_limit numeric(20,2),
  monthly_limit numeric(20,2),
  max_requests_per_day integer not null default 3 check (max_requests_per_day > 0),
  fee numeric(20,2) not null default 0 check (fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country, method, currency)
);
alter table public.withdrawal_rules enable row level security;
revoke all on public.withdrawal_rules from anon, authenticated;
grant select on public.withdrawal_rules to authenticated;
grant all on public.withdrawal_rules to service_role;
drop policy if exists withdrawal_rules_admin_select on public.withdrawal_rules;
create policy withdrawal_rules_admin_select on public.withdrawal_rules for select to authenticated using (public.is_taskora_admin());

insert into public.withdrawal_rules(country,method,currency,min_amount,max_amount,daily_limit,weekly_limit,monthly_limit,max_requests_per_day,fee)
values ('MZ','mpesa','MZN',210,70000,140000,350000,700000,3,0)
on conflict (country,method,currency) do nothing;

create table if not exists public.withdrawal_audit_log (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references public.withdrawals(id) on delete restrict,
  actor_id uuid references auth.users(id),
  action text not null,
  from_status text,
  to_status text,
  amount numeric(20,2),
  currency text,
  provider text,
  reference text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.withdrawal_audit_log enable row level security;
revoke all on public.withdrawal_audit_log from anon, authenticated;
grant select on public.withdrawal_audit_log to authenticated;
grant all on public.withdrawal_audit_log to service_role;
create policy withdrawal_audit_admin_select on public.withdrawal_audit_log for select to authenticated using (public.is_taskora_admin());

create table if not exists public.withdrawal_provider_events (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references public.withdrawals(id) on delete restrict,
  provider text not null,
  provider_event_id text,
  provider_transaction_id text,
  state text not null,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider,provider_event_id)
);
alter table public.withdrawal_provider_events enable row level security;
revoke all on public.withdrawal_provider_events from anon, authenticated;
grant select on public.withdrawal_provider_events to authenticated;
grant all on public.withdrawal_provider_events to service_role;
create policy withdrawal_provider_events_admin_select on public.withdrawal_provider_events for select to authenticated using (public.is_taskora_admin());

create unique index if not exists financial_payout_reservations_withdrawal_key
on public.financial_payout_reservations(withdrawal_id) where withdrawal_id is not null;

create or replace function public.reserve_user_funds(
  p_user_id uuid,p_amount numeric,p_currency text,p_idempotency_key text,p_withdrawal_id uuid default null
)
returns public.financial_payout_reservations
language plpgsql security definer set search_path=''
as $$
declare
 v_existing public.financial_payout_reservations%rowtype;
 v_available uuid; v_reserved uuid; v_entry uuid; v_balance numeric;
 v_row public.financial_payout_reservations%rowtype;
begin
 if auth.role()<>'service_role' and auth.uid() is distinct from p_user_id then raise exception 'forbidden'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'invalid payout amount'; end if;
 if p_idempotency_key is null or length(trim(p_idempotency_key))<8 then raise exception 'invalid idempotency key'; end if;
 if p_withdrawal_id is not null and not exists(select 1 from public.withdrawals where id=p_withdrawal_id and user_id=p_user_id) and auth.role()<>'service_role' then raise exception 'forbidden'; end if;
 perform pg_advisory_xact_lock(hashtextextended('withdrawal-user:'||p_user_id::text,0));
 select * into v_existing from public.financial_payout_reservations
 where idempotency_key=p_idempotency_key or (p_withdrawal_id is not null and withdrawal_id=p_withdrawal_id) limit 1;
 if v_existing.id is not null then return v_existing; end if;
 v_available:=public.financial_ensure_account('user_available:'||p_user_id::text||':'||p_currency,'user_available_liability',p_user_id,p_currency);
 v_reserved:=public.financial_ensure_account('user_reserved:'||p_user_id::text||':'||p_currency,'user_reserved_liability',p_user_id,p_currency);
 select coalesce(sum(case when l.direction='CREDIT' then l.amount else -l.amount end),0) into v_balance
 from public.financial_ledger_lines l join public.financial_journal_entries j on j.id=l.journal_entry_id
 where l.account_id=v_available and j.status in ('POSTED','REVERSED');
 if v_balance<p_amount then raise exception 'insufficient_ledger_balance'; end if;
 insert into public.financial_payout_reservations(withdrawal_id,user_id,amount,currency,idempotency_key,status)
 values(p_withdrawal_id,p_user_id,round(p_amount,2),p_currency,p_idempotency_key,'RESERVED') returning * into v_row;
 insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id)
 values('payout-reserve:'||v_row.id,'payout_reservation','POSTED',p_currency,'Reserva de saldo para levantamento','payout',v_row.id::text) returning id into v_entry;
 insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency)
 values(v_entry,v_available,'DEBIT',v_row.amount,p_currency),(v_entry,v_reserved,'CREDIT',v_row.amount,p_currency);
 update public.financial_payout_reservations set reserved_journal_entry_id=v_entry where id=v_row.id returning * into v_row;
 return v_row;
end;
$$;
revoke all on function public.reserve_user_funds(uuid,numeric,text,text,uuid) from public,anon;
grant execute on function public.reserve_user_funds(uuid,numeric,text,text,uuid) to authenticated,service_role;

create or replace function public.finalize_user_payout(p_reservation_id uuid,p_success boolean,p_provider_transaction_id text default null)
returns public.financial_payout_reservations
language plpgsql security definer set search_path=''
as $$
declare
 v_r public.financial_payout_reservations%rowtype; v_reserved uuid; v_available uuid; v_cash uuid; v_entry uuid;
begin
 if auth.role()<>'service_role' and not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 select * into v_r from public.financial_payout_reservations where id=p_reservation_id for update;
 if v_r.id is null then raise exception 'reservation not found'; end if;
 if v_r.status in ('PAID','FAILED','CANCELLED') then return v_r; end if;
 v_reserved:=public.financial_ensure_account('user_reserved:'||v_r.user_id::text||':'||v_r.currency,'user_reserved_liability',v_r.user_id,v_r.currency);
 v_available:=public.financial_ensure_account('user_available:'||v_r.user_id::text||':'||v_r.currency,'user_available_liability',v_r.user_id,v_r.currency);
 v_cash:=public.financial_ensure_account('platform_cash:'||v_r.currency,'platform_cash',null,v_r.currency);
 insert into public.financial_journal_entries(reference,entry_type,status,currency,description,source_type,source_id,metadata)
 values('payout-finalize:'||v_r.id||':'||case when p_success then 'paid' else 'failed' end,
 case when p_success then 'payout_paid' else 'payout_failed' end,'POSTED',v_r.currency,
 case when p_success then 'Levantamento confirmado pelo provedor' else 'Levantamento falhou e a reserva foi libertada' end,
 'payout',v_r.id::text,jsonb_build_object('provider_transaction_id',p_provider_transaction_id)) returning id into v_entry;
 if p_success then
   insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency) values(v_entry,v_reserved,'DEBIT',v_r.amount,v_r.currency),(v_entry,v_cash,'CREDIT',v_r.amount,v_r.currency);
 else
   insert into public.financial_ledger_lines(journal_entry_id,account_id,direction,amount,currency) values(v_entry,v_reserved,'DEBIT',v_r.amount,v_r.currency),(v_entry,v_available,'CREDIT',v_r.amount,v_r.currency);
 end if;
 update public.financial_payout_reservations set status=case when p_success then 'PAID' else 'FAILED' end,
 provider_transaction_id=coalesce(p_provider_transaction_id,provider_transaction_id),final_journal_entry_id=v_entry,finalized_at=now()
 where id=v_r.id returning * into v_r;
 return v_r;
end;
$$;
revoke all on function public.finalize_user_payout(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.finalize_user_payout(uuid,boolean,text) to authenticated,service_role;

create or replace function public.request_withdrawal(
 _method text,_amount numeric,_account_holder text,_account_number text,_idempotency_key text,
 _min_amount numeric default null,_max_amount numeric default null
) returns public.withdrawals
language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid:=auth.uid(); v_profile public.profiles%rowtype; v_rule public.withdrawal_rules%rowtype;
 v_existing public.withdrawals%rowtype; v_row public.withdrawals%rowtype;
 v_reservation public.financial_payout_reservations%rowtype; v_reference text;
 v_day numeric; v_week numeric; v_month numeric; v_count integer;
begin
 if v_uid is null then raise exception 'not_authenticated'; end if;
 if _idempotency_key is null or length(trim(_idempotency_key))<8 then raise exception 'invalid_idempotency_key'; end if;
 if _amount is null or _amount<=0 then raise exception 'invalid_amount'; end if;
 perform pg_advisory_xact_lock(hashtextextended('withdrawal-user:'||v_uid::text,0));
 select * into v_profile from public.profiles where id=v_uid;
 if not found then raise exception 'profile_not_found'; end if;
 select * into v_existing from public.withdrawals where user_id=v_uid and idempotency_key=_idempotency_key limit 1;
 if found then return v_existing; end if;
 select * into v_rule from public.withdrawal_rules
 where country=coalesce(v_profile.country,'MZ') and method=lower(_method) and enabled=true limit 1;
 if not found then raise exception 'withdrawal_method_not_configured'; end if;
 if _amount<v_rule.min_amount or _amount>v_rule.max_amount then raise exception 'invalid_amount'; end if;
 if exists(select 1 from public.withdrawals where user_id=v_uid and status::text in ('pending','approved','processing','review')) then raise exception 'withdrawal_in_progress'; end if;
 select coalesce(sum(amount),0) into v_day from public.withdrawals where user_id=v_uid and currency=v_rule.currency and created_at>=date_trunc('day',now()) and status::text not in ('rejected','cancelled','failed');
 select coalesce(sum(amount),0) into v_week from public.withdrawals where user_id=v_uid and currency=v_rule.currency and created_at>=date_trunc('week',now()) and status::text not in ('rejected','cancelled','failed');
 select coalesce(sum(amount),0) into v_month from public.withdrawals where user_id=v_uid and currency=v_rule.currency and created_at>=date_trunc('month',now()) and status::text not in ('rejected','cancelled','failed');
 select count(*) into v_count from public.withdrawals where user_id=v_uid and currency=v_rule.currency and created_at>=date_trunc('day',now()) and status::text not in ('rejected','cancelled','failed');
 if v_rule.daily_limit is not null and v_day+_amount>v_rule.daily_limit then raise exception 'daily_withdrawal_limit'; end if;
 if v_rule.weekly_limit is not null and v_week+_amount>v_rule.weekly_limit then raise exception 'weekly_withdrawal_limit'; end if;
 if v_rule.monthly_limit is not null and v_month+_amount>v_rule.monthly_limit then raise exception 'monthly_withdrawal_limit'; end if;
 if v_count>=v_rule.max_requests_per_day then raise exception 'withdrawal_request_limit'; end if;
 if _account_holder is null or length(trim(_account_holder))<2 then raise exception 'invalid_account_holder'; end if;
 if _account_number is null or length(trim(_account_number))<6 then raise exception 'invalid_account'; end if;
 v_reference:='TSK'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,17));
 insert into public.withdrawals(user_id,method,provider,account_holder,account_number,amount,currency,status,reference,idempotency_key,country)
 values(v_uid,lower(_method),lower(_method),left(trim(_account_holder),100),trim(_account_number),round(_amount,2),v_rule.currency,'pending',v_reference,_idempotency_key,coalesce(v_profile.country,'MZ')) returning * into v_row;
 v_reservation:=public.reserve_user_funds(v_uid,v_row.amount,v_row.currency,'withdrawal:'||v_row.id::text,v_row.id);
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,to_status,amount,currency,provider,reference,metadata)
 values(v_row.id,v_uid,'REQUESTED','pending',v_row.amount,v_row.currency,v_row.provider,v_row.reference,jsonb_build_object('reservation_id',v_reservation.id,'rule_id',v_rule.id));
 perform public.create_taskora_notification(v_uid,'withdrawal_created','Pedido de levantamento recebido','O seu pedido de levantamento foi recebido e aguarda análise.','important','/app/withdrawals',jsonb_build_object('withdrawal_id',v_row.id,'reference',v_row.reference),'withdrawal:'||v_row.id::text||':created','withdrawal');
 return v_row;
end;
$$;
revoke all on function public.request_withdrawal(text,numeric,text,text,text,numeric,numeric) from public,anon;
grant execute on function public.request_withdrawal(text,numeric,text,text,text,numeric,numeric) to authenticated;

create or replace function public.get_admin_withdrawals(p_status text default null,p_search text default null,p_limit integer default 100)
returns table(id uuid,reference text,user_id uuid,user_name text,user_email text,amount numeric,currency text,method text,destination_masked text,created_at timestamptz,status text,transaction_id text,reservation_id uuid,provider text,failure_reason text,rejection_reason text,approved_at timestamptz,processed_at timestamptz)
language sql stable security definer set search_path=''
as $$
 select w.id,w.reference,w.user_id,coalesce(p.full_name,'—'),p.email,w.amount,w.currency,w.method,
 case when length(w.account_number)<=6 then '••••••' else left(w.account_number,3)||'••••'||right(w.account_number,3) end,
 w.created_at,w.status::text,w.transaction_id,r.id,w.provider,w.failure_reason,w.rejection_reason,w.approved_at,w.processed_at
 from public.withdrawals w left join public.profiles p on p.id=w.user_id
 left join public.financial_payout_reservations r on r.withdrawal_id=w.id
 where public.is_taskora_admin() and (p_status is null or w.status::text=p_status)
 and (p_search is null or p_search='' or w.reference ilike '%'||p_search||'%' or p.email ilike '%'||p_search||'%' or p.full_name ilike '%'||p_search||'%')
 order by w.created_at desc limit greatest(1,least(coalesce(p_limit,100),500));
$$;
revoke all on function public.get_admin_withdrawals(text,text,integer) from public,anon;
grant execute on function public.get_admin_withdrawals(text,text,integer) to authenticated;

create or replace function public.approve_withdrawal(p_withdrawal_id uuid)
returns public.withdrawals language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype; v_uid uuid:=auth.uid();
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
 if not found then raise exception 'withdrawal_not_found'; end if;
 if v_w.status::text='approved' then return v_w; end if;
 if v_w.status::text<>'pending' then raise exception 'withdrawal_not_approvable'; end if;
 select * into v_r from public.financial_payout_reservations where withdrawal_id=v_w.id for update;
 if v_r.id is null or v_r.status<>'RESERVED' then raise exception 'withdrawal_reservation_missing'; end if;
 if exists(select 1 from auth.users u where u.id=v_w.user_id and (u.deleted_at is not null or (u.banned_until is not null and u.banned_until>now()))) then raise exception 'account_not_active'; end if;
 update public.withdrawals set status='approved',approved_at=now(),reviewer_id=v_uid,updated_at=now() where id=v_w.id returning * into v_w;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference) values(v_w.id,v_uid,'APPROVED','pending','approved',v_w.amount,v_w.currency,v_w.provider,v_w.reference);
 perform public.create_taskora_notification(v_w.user_id,'withdrawal_approved','Pedido de levantamento aprovado','O seu pedido de levantamento foi aprovado e será processado.','important','/app/withdrawals',jsonb_build_object('withdrawal_id',v_w.id,'reference',v_w.reference),'withdrawal:'||v_w.id::text||':approved','withdrawal');
 return v_w;
end;
$$;
revoke all on function public.approve_withdrawal(uuid) from public,anon;
grant execute on function public.approve_withdrawal(uuid) to authenticated;

create or replace function public.reject_withdrawal(p_withdrawal_id uuid,p_reason text)
returns public.withdrawals language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype; v_uid uuid:=auth.uid(); v_from text;
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 if p_reason is null or length(trim(p_reason))<3 then raise exception 'rejection_reason_required'; end if;
 select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
 if not found then raise exception 'withdrawal_not_found'; end if;
 v_from:=v_w.status::text;
 if v_from not in ('pending','review','approved') then raise exception 'withdrawal_not_rejectable'; end if;
 select * into v_r from public.financial_payout_reservations where withdrawal_id=v_w.id for update;
 if v_r.id is not null and v_r.status='RESERVED' then perform public.finalize_user_payout(v_r.id,false,null); end if;
 update public.withdrawals set status='rejected',rejection_reason=left(trim(p_reason),1000),rejected_at=now(),reviewer_id=v_uid,processed_at=now(),updated_at=now() where id=v_w.id returning * into v_w;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference,reason) values(v_w.id,v_uid,'REJECTED',v_from,'rejected',v_w.amount,v_w.currency,v_w.provider,v_w.reference,p_reason);
 perform public.create_taskora_notification(v_w.user_id,'withdrawal_rejected','Pedido de levantamento rejeitado','O seu pedido de levantamento foi rejeitado: '||left(trim(p_reason),500),'important','/app/withdrawals',jsonb_build_object('withdrawal_id',v_w.id,'reference',v_w.reference,'reason',p_reason),'withdrawal:'||v_w.id::text||':rejected','withdrawal');
 return v_w;
end;
$$;
revoke all on function public.reject_withdrawal(uuid,text) from public,anon;
grant execute on function public.reject_withdrawal(uuid,text) to authenticated;

create or replace function public.mark_withdrawal_review(p_withdrawal_id uuid,p_reason text)
returns public.withdrawals language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_uid uuid:=auth.uid(); v_from text;
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 if p_reason is null or length(trim(p_reason))<3 then raise exception 'review_reason_required'; end if;
 select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
 if not found then raise exception 'withdrawal_not_found'; end if;
 v_from:=v_w.status::text;
 if v_from not in ('pending','approved') then raise exception 'withdrawal_not_reviewable'; end if;
 update public.withdrawals set status='review',rejection_reason=left(trim(p_reason),1000),reviewer_id=v_uid,updated_at=now() where id=v_w.id returning * into v_w;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference,reason) values(v_w.id,v_uid,'REVIEW',v_from,'review',v_w.amount,v_w.currency,v_w.provider,v_w.reference,p_reason);
 return v_w;
end;
$$;
revoke all on function public.mark_withdrawal_review(uuid,text) from public,anon;
grant execute on function public.mark_withdrawal_review(uuid,text) to authenticated;

create or replace function public.mark_withdrawal_processing(_id uuid,_environment text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype;
begin
 if auth.role()<>'service_role' and not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 select * into v_w from public.withdrawals where id=_id for update;
 if not found or v_w.status::text<>'approved' then return false; end if;
 select * into v_r from public.financial_payout_reservations where withdrawal_id=v_w.id for update;
 if v_r.id is null or v_r.status<>'RESERVED' then raise exception 'withdrawal_reservation_missing'; end if;
 update public.withdrawals set status='processing',environment=_environment,updated_at=now() where id=_id;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference) values(v_w.id,null,'PROCESSING','approved','processing',v_w.amount,v_w.currency,v_w.provider,v_w.reference);
 perform public.create_taskora_notification(v_w.user_id,'withdrawal_processing','Levantamento em processamento','O seu levantamento está a ser processado.','important','/app/withdrawals',jsonb_build_object('withdrawal_id',v_w.id,'reference',v_w.reference),'withdrawal:'||v_w.id::text||':processing','withdrawal');
 return true;
end;
$$;
revoke all on function public.mark_withdrawal_processing(uuid,text) from public,anon,authenticated;
grant execute on function public.mark_withdrawal_processing(uuid,text) to service_role;

create or replace function public.finalize_withdrawal(_id uuid,_success boolean,_transaction_id text,_conversation_id text,_response_code text,_reason text)
returns public.withdrawals language plpgsql security definer set search_path=''
as $$
declare v_w public.withdrawals%rowtype; v_r public.financial_payout_reservations%rowtype; v_old text;
begin
 if auth.role()<>'service_role' and not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 select * into v_w from public.withdrawals where id=_id for update;
 if not found then raise exception 'withdrawal_not_found'; end if;
 v_old:=v_w.status::text;
 if v_old in ('paid','failed') then return v_w; end if;
 if v_old<>'processing' then raise exception 'withdrawal_not_processing'; end if;
 select * into v_r from public.financial_payout_reservations where withdrawal_id=v_w.id for update;
 if v_r.id is null then raise exception 'withdrawal_reservation_missing'; end if;
 if _success then
   if _transaction_id is null or length(trim(_transaction_id))<2 then raise exception 'provider_transaction_id_required'; end if;
   perform public.finalize_user_payout(v_r.id,true,_transaction_id);
   insert into public.transactions(user_id,type,amount,currency,reference,description) values(v_w.user_id,'withdrawal',v_w.amount,v_w.currency,v_w.reference,'Levantamento '||v_w.method);
   update public.withdrawals set status='paid',transaction_id=_transaction_id,provider_conversation_id=_conversation_id,provider_response_code=_response_code,processed_at=now(),updated_at=now() where id=_id returning * into v_w;
 else
   perform public.finalize_user_payout(v_r.id,false,null);
   update public.withdrawals set status='failed',provider_conversation_id=_conversation_id,provider_response_code=_response_code,failure_reason=left(coalesce(_reason,'Payout falhou'),1000),processed_at=now(),updated_at=now() where id=_id returning * into v_w;
 end if;
 insert into public.withdrawal_audit_log(withdrawal_id,actor_id,action,from_status,to_status,amount,currency,provider,reference,reason,metadata)
 values(v_w.id,null,case when _success then 'PAID' else 'FAILED' end,v_old,v_w.status::text,v_w.amount,v_w.currency,v_w.provider,v_w.reference,_reason,jsonb_build_object('transaction_id',_transaction_id,'conversation_id',_conversation_id,'response_code',_response_code));
 perform public.create_taskora_notification(v_w.user_id,case when _success then 'withdrawal_paid' else 'withdrawal_failed' end,case when _success then 'Levantamento concluído' else 'Levantamento falhou' end,case when _success then 'O seu levantamento foi concluído.' else 'O seu levantamento não pôde ser concluído. O pedido será analisado.' end,'important','/app/withdrawals',jsonb_build_object('withdrawal_id',v_w.id,'reference',v_w.reference,'transaction_id',_transaction_id,'reason',_reason),'withdrawal:'||v_w.id::text||':'||case when _success then 'paid' else 'failed' end,'withdrawal');
 return v_w;
end;
$$;
revoke all on function public.finalize_withdrawal(uuid,boolean,text,text,text,text) from public,anon,authenticated;
grant execute on function public.finalize_withdrawal(uuid,boolean,text,text,text,text) to service_role;

create or replace function public.upsert_withdrawal_rule(
 p_id uuid,p_country text,p_method text,p_currency text,p_enabled boolean,
 p_min numeric,p_max numeric,p_daily numeric,p_weekly numeric,p_monthly numeric,p_max_requests integer,p_fee numeric
) returns public.withdrawal_rules language plpgsql security definer set search_path=''
as $$
declare v public.withdrawal_rules%rowtype;
begin
 if not public.is_taskora_admin() then raise exception 'forbidden'; end if;
 if p_min<=0 or p_max<p_min or p_max_requests<=0 or p_fee<0 then raise exception 'invalid_rule'; end if;
 insert into public.withdrawal_rules(id,country,method,currency,enabled,min_amount,max_amount,daily_limit,weekly_limit,monthly_limit,max_requests_per_day,fee)
 values(coalesce(p_id,gen_random_uuid()),upper(p_country),lower(p_method),upper(p_currency),p_enabled,p_min,p_max,p_daily,p_weekly,p_monthly,p_max_requests,p_fee)
 on conflict(country,method,currency) do update set enabled=excluded.enabled,min_amount=excluded.min_amount,max_amount=excluded.max_amount,
 daily_limit=excluded.daily_limit,weekly_limit=excluded.weekly_limit,monthly_limit=excluded.monthly_limit,max_requests_per_day=excluded.max_requests_per_day,fee=excluded.fee,updated_at=now()
 returning * into v;
 return v;
end;
$$;
revoke all on function public.upsert_withdrawal_rule(uuid,text,text,text,boolean,numeric,numeric,numeric,numeric,numeric,integer,numeric) from public,anon;
grant execute on function public.upsert_withdrawal_rule(uuid,text,text,text,boolean,numeric,numeric,numeric,numeric,numeric,integer,numeric) to authenticated;

create or replace function public.get_withdrawal_reconciliation()
returns table(currency text,reserved_ledger numeric,withdrawal_reserved numeric,provider_paid numeric,withdrawal_paid numeric,divergence numeric,status text)
language sql stable security definer set search_path=''
as $$
 with r as (select currency,coalesce(sum(amount) filter(where status='RESERVED'),0) reserved_ledger,coalesce(sum(amount) filter(where status='PAID'),0) provider_paid from public.financial_payout_reservations group by currency),
 w as (select currency,coalesce(sum(amount) filter(where status::text in ('pending','approved','processing','review')),0) withdrawal_reserved,coalesce(sum(amount) filter(where status::text='paid'),0) withdrawal_paid from public.withdrawals group by currency)
 select coalesce(r.currency,w.currency),coalesce(r.reserved_ledger,0),coalesce(w.withdrawal_reserved,0),coalesce(r.provider_paid,0),coalesce(w.withdrawal_paid,0),
 (coalesce(r.reserved_ledger,0)-coalesce(w.withdrawal_reserved,0))+(coalesce(r.provider_paid,0)-coalesce(w.withdrawal_paid,0)),
 case when abs((coalesce(r.reserved_ledger,0)-coalesce(w.withdrawal_reserved,0))+(coalesce(r.provider_paid,0)-coalesce(w.withdrawal_paid,0)))<0.01 then 'RECONCILIADO' else 'DIVERGÊNCIA FINANCEIRA' end
 from r full join w on w.currency=r.currency where public.is_taskora_admin();
$$;
revoke all on function public.get_withdrawal_reconciliation() from public,anon;
grant execute on function public.get_withdrawal_reconciliation() to authenticated;
