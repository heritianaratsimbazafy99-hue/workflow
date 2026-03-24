create table if not exists public.workflow_cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  run_key text,
  trigger_source text not null default 'manual',
  request_path text not null,
  invoked_by text,
  status text not null check (status in ('started', 'succeeded', 'failed')),
  result jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists workflow_cron_runs_job_run_key_idx
  on public.workflow_cron_runs (job_name, run_key)
  where run_key is not null;

create index if not exists workflow_cron_runs_started_idx
  on public.workflow_cron_runs (job_name, started_at desc);

alter table public.workflow_cron_runs enable row level security;

drop policy if exists workflow_cron_runs_select_admin on public.workflow_cron_runs;
create policy workflow_cron_runs_select_admin
on public.workflow_cron_runs
for select
to authenticated
using (public.is_admin());

drop policy if exists workflow_cron_runs_manage_admin on public.workflow_cron_runs;
create policy workflow_cron_runs_manage_admin
on public.workflow_cron_runs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'request_attachments_storage_path_key'
  ) then
    alter table public.request_attachments
      add constraint request_attachments_storage_path_key unique (storage_path);
  end if;
end $$;

drop policy if exists requests_update_participants on public.requests;
drop policy if exists requests_update_admin_only on public.requests;
create policy requests_update_admin_only
on public.requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists request_step_instances_update_approver on public.request_step_instances;
drop policy if exists request_step_instances_update_admin_only on public.request_step_instances;
create policy request_step_instances_update_admin_only
on public.request_step_instances
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists workflow_sla_events_select_visible on public.workflow_sla_events;
create policy workflow_sla_events_select_visible
on public.workflow_sla_events
for select
to authenticated
using (public.is_admin() or public.is_request_participant(request_id));

drop policy if exists message_mentions_insert_visible on public.message_mentions;
create policy message_mentions_insert_visible
on public.message_mentions
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.messages m
    join public.conversation_members cm
      on cm.conversation_id = m.conversation_id
     and cm.user_id = user_id
    where m.id = message_id
      and public.is_conversation_member(m.conversation_id)
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'requests'
  ) then
    alter publication supabase_realtime add table public.requests;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'request_step_instances'
  ) then
    alter publication supabase_realtime add table public.request_step_instances;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'request_comments'
  ) then
    alter publication supabase_realtime add table public.request_comments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'request_attachments'
  ) then
    alter publication supabase_realtime add table public.request_attachments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workflow_sla_events'
  ) then
    alter publication supabase_realtime add table public.workflow_sla_events;
  end if;
end $$;
