-- TASKORA: dependências necessárias para o fluxo empresarial e moderação.
-- Migração aditiva; cria funções, tabelas de auditoria e colunas em falta.

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

alter table public.security_audit_log enable row level security;
revoke all on public.security_audit_log from anon, authenticated;
grant select on public.security_audit_log to authenticated;
grant all on public.security_audit_log to service_role;

create policy security_audit_admin_read
on public.security_audit_log for select to authenticated
using (public.is_taskora_admin());

create table if not exists public.task_audit_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.task_audit_log enable row level security;
revoke all on public.task_audit_log from anon, authenticated;
grant select on public.task_audit_log to authenticated;
grant all on public.task_audit_log to service_role;

create policy task_audit_admin_or_company
on public.task_audit_log for select to authenticated
using (
  public.is_taskora_admin()
  or exists (
    select 1 from public.tasks t
    join public.companies c on c.id=t.company_id
    where t.id=task_audit_log.task_id and c.owner_id=auth.uid()
  )
);

alter table public.tasks
  add column if not exists origin text,
  add column if not exists budget_total numeric(20,2),
  add column if not exists is_draft boolean not null default false,
  add column if not exists objective text,
  add column if not exists worker_instructions text,
  add column if not exists target_country text,
  add column if not exists target_language text,
  add column if not exists destination_url text,
  add column if not exists completion_criteria text;

update public.tasks set origin = 'internal' where origin is null;

comment on column public.tasks.origin is 'Origem da tarefa: internal (campanha empresarial) ou provider (API externa).';