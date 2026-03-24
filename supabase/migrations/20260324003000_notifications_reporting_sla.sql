create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  approvals_in_app boolean not null default true,
  approvals_email boolean not null default true,
  messages_in_app boolean not null default true,
  messages_email boolean not null default false,
  mentions_in_app boolean not null default true,
  mentions_email boolean not null default true,
  sla_in_app boolean not null default true,
  sla_email boolean not null default true,
  digest_enabled boolean not null default false,
  digest_frequency text not null default 'daily' check (digest_frequency in ('daily', 'weekly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_sla_events (
  id uuid primary key default gen_random_uuid(),
  request_step_instance_id uuid not null references public.request_step_instances (id) on delete cascade,
  request_id uuid not null references public.requests (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  event_kind text not null check (event_kind in ('reminder', 'escalation')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (request_step_instance_id, recipient_id, event_kind)
);

create index if not exists workflow_sla_events_request_idx
  on public.workflow_sla_events (request_id, created_at desc);

create index if not exists workflow_sla_events_recipient_idx
  on public.workflow_sla_events (recipient_id, created_at desc);

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

alter table public.notifications
  add column if not exists category text not null default 'general';

alter table public.notifications
  drop constraint if exists notifications_category_check;

alter table public.notifications
  add constraint notifications_category_check
  check (category in ('general', 'approval', 'message', 'mention', 'sla', 'system', 'digest'));

alter table public.notification_preferences enable row level security;
alter table public.workflow_sla_events enable row level security;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own
on public.notification_preferences
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own
on public.notification_preferences
for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists workflow_sla_events_select_visible on public.workflow_sla_events;
create policy workflow_sla_events_select_visible
on public.workflow_sla_events
for select
to authenticated
using (recipient_id = auth.uid() or public.is_admin());

insert into public.notification_preferences (user_id)
select p.id
from public.profiles p
on conflict (user_id) do nothing;

create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_ensure_notification_preferences on public.profiles;
create trigger profiles_ensure_notification_preferences
after insert on public.profiles
for each row
execute function public.ensure_notification_preferences();
