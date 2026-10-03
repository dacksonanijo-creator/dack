alter table public.task_provider_registry
  drop constraint if exists task_provider_registry_status_check;

alter table public.task_provider_registry
  add constraint task_provider_registry_status_check
  check (status in ('not_configured','connected','attention','error','disabled'));

alter table public.task_provider_registry
  add column if not exists last_communication_at timestamptz;

alter table public.offerwall_ad_provider_config
  add column if not exists last_communication_at timestamptz;

alter table public.ayet_studios_provider_config
  add column if not exists last_communication_at timestamptz;
