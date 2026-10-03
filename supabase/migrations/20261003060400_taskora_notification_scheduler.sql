create extension if not exists pg_cron;
select cron.schedule('taskora-notification-campaigns','* * * * *','select public.process_due_notification_campaigns();');