-- TASKORA VERIFICATION: submissions can only change through the verification engine

revoke insert, update, delete on public.task_submissions from authenticated;

drop policy if exists "Users create own submissions" on public.task_submissions;
drop policy if exists "Users update own pending submissions" on public.task_submissions;
drop policy if exists "Admins manage submissions" on public.task_submissions;

create policy "Admins view submissions"
on public.task_submissions for select to authenticated
using (public.is_taskora_admin());

grant select on public.task_submissions to authenticated;
