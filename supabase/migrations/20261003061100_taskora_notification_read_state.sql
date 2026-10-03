create or replace function public.sync_notification_read_state() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if NEW.read_at is not null and OLD.read_at is null then
  update public.notification_deliveries set status='read',updated_at=now() where notification_id=NEW.id and channel='taskora' and status in ('delivered','sent');
 end if; return NEW;
end; $$;
drop trigger if exists trg_notification_read_state on public.notifications;
create trigger trg_notification_read_state after update of read_at on public.notifications for each row execute function public.sync_notification_read_state();