create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.app_role as enum ('admin', 'manager', 'employee');
create type public.request_status as enum (
  'draft',
  'submitted',
  'in_review',
  'needs_changes',
  'approved',
  'rejected',
  'completed',
  'cancelled'
);
create type public.request_priority as enum ('low', 'normal', 'high', 'critical');
create type public.workflow_step_kind as enum ('approval', 'review', 'task', 'payment', 'notification');
create type public.workflow_step_status as enum ('pending', 'approved', 'rejected', 'returned', 'skipped');
create type public.notification_channel as enum ('in_app', 'email');
create type public.conversation_type as enum ('direct', 'group', 'request');
create type public.message_kind as enum ('text', 'system', 'file');

create sequence if not exists public.request_ref_seq start 1;

create or replace function public.generate_request_reference()
returns text
language sql
as $$
  select
    'REQ-'
    || to_char(now(), 'YYYY')
    || '-'
    || lpad(nextval('public.request_ref_seq')::text, 6, '0');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext unique,
  full_name text not null default '',
  role public.app_role not null default 'employee',
  department_id uuid references public.departments (id) on delete set null,
  job_title text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  department_id uuid references public.departments (id) on delete set null,
  default_sla_hours integer not null default 24 check (default_sla_hours > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  request_type_id uuid references public.request_types (id) on delete set null,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates (id) on delete cascade,
  step_order integer not null check (step_order > 0),
  name text not null,
  kind public.workflow_step_kind not null,
  approver_mode text not null default 'manager' check (
    approver_mode in ('user', 'manager', 'department_role', 'dynamic')
  ),
  approver_user_id uuid references public.profiles (id) on delete set null,
  approver_department_id uuid references public.departments (id) on delete set null,
  min_approvals integer not null default 1 check (min_approvals > 0),
  sla_hours integer not null default 24 check (sla_hours > 0),
  condition_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, step_order)
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_request_reference(),
  requester_id uuid not null references public.profiles (id) on delete restrict,
  request_type_id uuid not null references public.request_types (id) on delete restrict,
  workflow_template_id uuid references public.workflow_templates (id) on delete set null,
  title text not null,
  description text not null default '',
  amount numeric(14, 2) check (amount is null or amount >= 0),
  currency char(3) not null default 'EUR',
  priority public.request_priority not null default 'normal',
  status public.request_status not null default 'draft',
  current_step_order integer,
  current_assignee_id uuid references public.profiles (id) on delete set null,
  due_at timestamptz,
  submitted_at timestamptz,
  decided_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_step_instances (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  template_step_id uuid references public.workflow_template_steps (id) on delete set null,
  step_order integer not null check (step_order > 0),
  name text not null,
  kind public.workflow_step_kind not null,
  approver_id uuid references public.profiles (id) on delete set null,
  status public.workflow_step_status not null default 'pending',
  assigned_at timestamptz not null default now(),
  acted_at timestamptz,
  due_at timestamptz,
  comment text,
  unique (request_id, step_order)
);

create table if not exists public.request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  is_internal boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  uploader_id uuid references public.profiles (id) on delete set null,
  bucket text not null default 'request-files',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.requests (id) on delete cascade,
  channel public.notification_channel not null,
  title text not null,
  body text not null,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'group',
  request_id uuid references public.requests (id) on delete cascade,
  title text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists conversations_request_unique_idx
  on public.conversations (request_id)
  where type = 'request';

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  kind public.message_kind not null default 'text',
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.message_reads (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists profiles_department_idx on public.profiles (department_id);
create index if not exists request_types_department_idx on public.request_types (department_id);
create index if not exists requests_requester_idx on public.requests (requester_id);
create index if not exists requests_assignee_idx on public.requests (current_assignee_id);
create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_due_at_idx on public.requests (due_at);
create index if not exists request_steps_request_idx on public.request_step_instances (request_id);
create index if not exists request_steps_approver_idx on public.request_step_instances (approver_id);
create index if not exists request_steps_due_at_idx on public.request_step_instances (due_at);
create index if not exists request_comments_request_idx on public.request_comments (request_id, created_at desc);
create index if not exists request_attachments_request_idx on public.request_attachments (request_id, created_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id, read_at, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id, joined_at desc);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc);

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
before update on public.departments
for each row
execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists request_types_set_updated_at on public.request_types;
create trigger request_types_set_updated_at
before update on public.request_types
for each row
execute function public.set_updated_at();

drop trigger if exists workflow_templates_set_updated_at on public.workflow_templates;
create trigger workflow_templates_set_updated_at
before update on public.workflow_templates
for each row
execute function public.set_updated_at();

drop trigger if exists workflow_template_steps_set_updated_at on public.workflow_template_steps;
create trigger workflow_template_steps_set_updated_at
before update on public.workflow_template_steps
for each row
execute function public.set_updated_at();

drop trigger if exists requests_set_updated_at on public.requests;
create trigger requests_set_updated_at
before update on public.requests
for each row
execute function public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.create_request_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  insert into public.conversations (type, request_id, title, created_by)
  values ('request', new.id, new.title, new.requester_id)
  on conflict do nothing;

  select id
    into v_conversation_id
  from public.conversations
  where request_id = new.id
    and type = 'request'
  limit 1;

  if v_conversation_id is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, new.requester_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists requests_create_conversation on public.requests;
create trigger requests_create_conversation
after insert on public.requests
for each row
execute function public.create_request_conversation();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_request_participant(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requests r
    where r.id = p_request_id
      and (
        r.requester_id = auth.uid()
        or r.current_assignee_id = auth.uid()
      )
  )
  or exists (
    select 1
    from public.request_step_instances rsi
    where rsi.request_id = p_request_id
      and rsi.approver_id = auth.uid()
  );
$$;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  );
$$;

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.request_types enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_template_steps enable row level security;
alter table public.requests enable row level security;
alter table public.request_step_instances enable row level security;
alter table public.request_comments enable row level security;
alter table public.request_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

drop policy if exists departments_select_authenticated on public.departments;
create policy departments_select_authenticated
on public.departments
for select
to authenticated
using (true);

drop policy if exists departments_admin_manage on public.departments;
create policy departments_admin_manage
on public.departments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists request_types_select_authenticated on public.request_types;
create policy request_types_select_authenticated
on public.request_types
for select
to authenticated
using (true);

drop policy if exists request_types_admin_manage on public.request_types;
create policy request_types_admin_manage
on public.request_types
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists workflow_templates_select_authenticated on public.workflow_templates;
create policy workflow_templates_select_authenticated
on public.workflow_templates
for select
to authenticated
using (true);

drop policy if exists workflow_templates_admin_manage on public.workflow_templates;
create policy workflow_templates_admin_manage
on public.workflow_templates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists workflow_template_steps_select_authenticated on public.workflow_template_steps;
create policy workflow_template_steps_select_authenticated
on public.workflow_template_steps
for select
to authenticated
using (true);

drop policy if exists workflow_template_steps_admin_manage on public.workflow_template_steps;
create policy workflow_template_steps_admin_manage
on public.workflow_template_steps
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists requests_select_participants on public.requests;
create policy requests_select_participants
on public.requests
for select
to authenticated
using (public.is_admin() or public.is_request_participant(id));

drop policy if exists requests_insert_requester on public.requests;
create policy requests_insert_requester
on public.requests
for insert
to authenticated
with check (requester_id = auth.uid());

drop policy if exists requests_update_participants on public.requests;
create policy requests_update_participants
on public.requests
for update
to authenticated
using (
  public.is_admin()
  or requester_id = auth.uid()
  or current_assignee_id = auth.uid()
)
with check (
  public.is_admin()
  or requester_id = auth.uid()
  or current_assignee_id = auth.uid()
);

drop policy if exists request_step_instances_select_participants on public.request_step_instances;
create policy request_step_instances_select_participants
on public.request_step_instances
for select
to authenticated
using (public.is_admin() or public.is_request_participant(request_id));

drop policy if exists request_step_instances_insert_admin on public.request_step_instances;
create policy request_step_instances_insert_admin
on public.request_step_instances
for insert
to authenticated
with check (public.is_admin());

drop policy if exists request_step_instances_update_approver on public.request_step_instances;
create policy request_step_instances_update_approver
on public.request_step_instances
for update
to authenticated
using (public.is_admin() or approver_id = auth.uid())
with check (public.is_admin() or approver_id = auth.uid());

drop policy if exists request_comments_select_participants on public.request_comments;
create policy request_comments_select_participants
on public.request_comments
for select
to authenticated
using (public.is_admin() or public.is_request_participant(request_id));

drop policy if exists request_comments_insert_participants on public.request_comments;
create policy request_comments_insert_participants
on public.request_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and (public.is_admin() or public.is_request_participant(request_id))
);

drop policy if exists request_attachments_select_participants on public.request_attachments;
create policy request_attachments_select_participants
on public.request_attachments
for select
to authenticated
using (public.is_admin() or public.is_request_participant(request_id));

drop policy if exists request_attachments_insert_participants on public.request_attachments;
create policy request_attachments_insert_participants
on public.request_attachments
for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and (public.is_admin() or public.is_request_participant(request_id))
);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications
for select
to authenticated
using (public.is_admin() or user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications
for update
to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

drop policy if exists audit_logs_select_visible on public.audit_logs;
create policy audit_logs_select_visible
on public.audit_logs
for select
to authenticated
using (
  public.is_admin()
  or (entity_type = 'request' and public.is_request_participant(entity_id))
);

drop policy if exists audit_logs_insert_self_or_admin on public.audit_logs;
create policy audit_logs_insert_self_or_admin
on public.audit_logs
for insert
to authenticated
with check (public.is_admin() or actor_id = auth.uid() or actor_id is null);

drop policy if exists conversations_select_members on public.conversations;
create policy conversations_select_members
on public.conversations
for select
to authenticated
using (public.is_admin() or public.is_conversation_member(id));

drop policy if exists conversations_insert_creator on public.conversations;
create policy conversations_insert_creator
on public.conversations
for insert
to authenticated
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists conversations_update_creator_or_admin on public.conversations;
create policy conversations_update_creator_or_admin
on public.conversations
for update
to authenticated
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

drop policy if exists conversation_members_select_members on public.conversation_members;
create policy conversation_members_select_members
on public.conversation_members
for select
to authenticated
using (public.is_admin() or public.is_conversation_member(conversation_id));

drop policy if exists conversation_members_manage_admin on public.conversation_members;
create policy conversation_members_manage_admin
on public.conversation_members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists messages_select_members on public.messages;
create policy messages_select_members
on public.messages
for select
to authenticated
using (public.is_admin() or public.is_conversation_member(conversation_id));

drop policy if exists messages_insert_members on public.messages;
create policy messages_insert_members
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (public.is_admin() or public.is_conversation_member(conversation_id))
);

drop policy if exists message_reads_select_members on public.message_reads;
create policy message_reads_select_members
on public.message_reads
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.messages m
    where m.id = message_id
      and public.is_conversation_member(m.conversation_id)
  )
);

drop policy if exists message_reads_insert_own on public.message_reads;
create policy message_reads_insert_own
on public.message_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.messages m
    where m.id = message_id
      and (public.is_admin() or public.is_conversation_member(m.conversation_id))
  )
);

insert into public.departments (code, name)
values
  ('FIN', 'Finance'),
  ('OPS', 'Operations'),
  ('IT', 'IT'),
  ('HR', 'HR'),
  ('LEG', 'Legal'),
  ('PRC', 'Procurement')
on conflict (code) do update
set name = excluded.name;

insert into public.request_types (code, name, description, department_id, default_sla_hours)
select
  seed.code,
  seed.name,
  seed.description,
  d.id,
  seed.default_sla_hours
from (
  values
    ('budget', 'Budget', 'Demande budgétaire avec validations par montant.', 'FIN', 48),
    ('payment', 'Paiement', 'Paiement fournisseur avec contrôle documentaire.', 'FIN', 12),
    ('repair', 'Réparation', 'Incident ou réparation site avec priorité et prestataires.', 'OPS', 24),
    ('purchase', 'Achat', 'Achat interne avec règles d''approbation.', 'PRC', 36),
    ('it', 'IT', 'Accès, matériel et support interne.', 'IT', 18),
    ('hr', 'RH', 'Demandes RH sensibles ou exceptionnelles.', 'HR', 72)
) as seed(code, name, description, department_code, default_sla_hours)
join public.departments d
  on d.code = seed.department_code
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  department_id = excluded.department_id,
  default_sla_hours = excluded.default_sla_hours;

insert into public.workflow_templates (code, name, description, request_type_id, version, is_active)
select
  seed.code,
  seed.name,
  seed.description,
  rt.id,
  1,
  true
from (
  values
    ('budget_standard', 'Budget standard', 'Manager puis Finance puis Direction si nécessaire.', 'budget'),
    ('payment_vendor', 'Paiement fournisseur', 'Contrôle pièces puis budget owner puis trésorerie.', 'payment'),
    ('repair_critical', 'Incident critique', 'Qualification puis opérations et sécurité.', 'repair')
) as seed(code, name, description, request_type_code)
join public.request_types rt
  on rt.code = seed.request_type_code
where not exists (
  select 1
  from public.workflow_templates wt
  where wt.code = seed.code
);

insert into public.workflow_template_steps (
  template_id,
  step_order,
  name,
  kind,
  approver_mode,
  min_approvals,
  sla_hours
)
select
  wt.id,
  seed.step_order,
  seed.name,
  seed.kind::public.workflow_step_kind,
  seed.approver_mode,
  1,
  seed.sla_hours
from (
  values
    ('budget_standard', 1, 'Validation manager', 'approval', 'manager', 8),
    ('budget_standard', 2, 'Contrôle budget', 'review', 'department_role', 12),
    ('budget_standard', 3, 'Feu vert direction', 'approval', 'dynamic', 24),
    ('payment_vendor', 1, 'Contrôle pièces', 'review', 'department_role', 4),
    ('payment_vendor', 2, 'Visa budget owner', 'approval', 'dynamic', 8),
    ('payment_vendor', 3, 'Mise en paiement', 'payment', 'department_role', 4),
    ('repair_critical', 1, 'Qualification', 'task', 'department_role', 2),
    ('repair_critical', 2, 'Accord opérations', 'approval', 'department_role', 4),
    ('repair_critical', 3, 'Accord sécurité', 'approval', 'department_role', 4)
) as seed(template_code, step_order, name, kind, approver_mode, sla_hours)
join public.workflow_templates wt
  on wt.code = seed.template_code
where not exists (
  select 1
  from public.workflow_template_steps wts
  where wts.template_id = wt.id
    and wts.step_order = seed.step_order
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
