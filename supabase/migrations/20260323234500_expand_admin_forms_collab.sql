create extension if not exists pgcrypto;
create extension if not exists citext;

alter table public.profiles
  add column if not exists username citext,
  add column if not exists display_name text;

create unique index if not exists profiles_username_idx
  on public.profiles (username)
  where username is not null;

with normalized as (
  select
    id,
    case
      when coalesce(regexp_replace(lower(split_part(coalesce(email::text, full_name), '@', 1)), '[^a-z0-9._-]', '', 'g'), '') = ''
        then 'user_' || left(replace(id::text, '-', ''), 8)
      else regexp_replace(lower(split_part(coalesce(email::text, full_name), '@', 1)), '[^a-z0-9._-]', '', 'g')
    end as base_username,
    row_number() over (
      partition by regexp_replace(lower(split_part(coalesce(email::text, full_name), '@', 1)), '[^a-z0-9._-]', '', 'g')
      order by created_at asc, id asc
    ) as rn
  from public.profiles
)
update public.profiles p
set username = case
  when normalized.rn = 1 then normalized.base_username
  else normalized.base_username || normalized.rn::text
end
from normalized
where p.id = normalized.id
  and p.username is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := regexp_replace(
    lower(split_part(coalesce(new.email, new.raw_user_meta_data ->> 'full_name', 'user'), '@', 1)),
    '[^a-z0-9._-]',
    '',
    'g'
  );

  if coalesce(v_username, '') = '' then
    v_username := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    v_username
  )
  on conflict (id) do update
  set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username);

  return new;
end;
$$;

create table if not exists public.request_type_field_definitions (
  id uuid primary key default gen_random_uuid(),
  request_type_id uuid not null references public.request_types (id) on delete cascade,
  section_key text not null default 'general',
  section_title text not null default 'Informations complémentaires',
  field_key text not null,
  label text not null,
  field_type text not null check (
    field_type in ('text', 'textarea', 'select', 'currency', 'date', 'checkbox')
  ),
  helper_text text not null default '',
  placeholder text,
  required boolean not null default false,
  width text not null default 'full' check (width in ('full', 'half')),
  options_json jsonb not null default '[]'::jsonb,
  sort_order integer not null default 1 check (sort_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_type_id, field_key)
);

create table if not exists public.message_mentions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists request_type_field_defs_type_idx
  on public.request_type_field_definitions (request_type_id, sort_order);

create index if not exists message_mentions_user_idx
  on public.message_mentions (user_id, created_at desc);

drop trigger if exists request_type_field_definitions_set_updated_at on public.request_type_field_definitions;
create trigger request_type_field_definitions_set_updated_at
before update on public.request_type_field_definitions
for each row
execute function public.set_updated_at();

alter table public.request_type_field_definitions enable row level security;
alter table public.message_mentions enable row level security;

drop policy if exists request_type_field_definitions_select_authenticated on public.request_type_field_definitions;
create policy request_type_field_definitions_select_authenticated
on public.request_type_field_definitions
for select
to authenticated
using (true);

drop policy if exists request_type_field_definitions_admin_manage on public.request_type_field_definitions;
create policy request_type_field_definitions_admin_manage
on public.request_type_field_definitions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists message_mentions_select_visible on public.message_mentions;
create policy message_mentions_select_visible
on public.message_mentions
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1
    from public.messages m
    where m.id = message_id
      and public.is_conversation_member(m.conversation_id)
  )
);

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
    where m.id = message_id
      and public.is_conversation_member(m.conversation_id)
  )
);

insert into public.request_type_field_definitions (
  request_type_id,
  section_key,
  section_title,
  field_key,
  label,
  field_type,
  helper_text,
  placeholder,
  required,
  width,
  options_json,
  sort_order
)
select
  rt.id,
  seed.section_key,
  seed.section_title,
  seed.field_key,
  seed.label,
  seed.field_type,
  seed.helper_text,
  seed.placeholder,
  seed.required,
  seed.width,
  seed.options_json::jsonb,
  seed.sort_order
from (
  values
    ('budget', 'budget_context', 'Contexte budget', 'cost_center', 'Centre de coût', 'text', 'Code ou unité porteuse du budget.', 'OPS-042', true, 'half', '[]', 1),
    ('budget', 'budget_context', 'Contexte budget', 'requested_for', 'Période concernée', 'text', 'Exercice ou période budgétaire visée.', 'T2 2026', true, 'half', '[]', 2),
    ('budget', 'business_case', 'Justification métier', 'expected_roi', 'Impact attendu', 'textarea', 'Décris le gain, la réduction de risque ou l’impact business.', 'Réduction des pannes, continuité d’exploitation...', true, 'full', '[]', 3),
    ('payment', 'vendor', 'Fournisseur', 'vendor_name', 'Nom du fournisseur', 'text', 'Raison sociale ou prestataire à payer.', 'Atlas Tech', true, 'half', '[]', 1),
    ('payment', 'vendor', 'Fournisseur', 'invoice_number', 'Numéro de facture', 'text', 'Référence documentaire pour la comptabilité.', 'FAC-2026-0198', true, 'half', '[]', 2),
    ('payment', 'vendor', 'Fournisseur', 'payment_reason', 'Motif du paiement', 'textarea', 'Explique le contexte de la facture ou de l’appel de fonds.', 'Maintenance corrective site Nord...', true, 'full', '[]', 3),
    ('repair', 'incident', 'Incident', 'site_name', 'Site concerné', 'text', 'Site, agence ou entrepôt concerné.', 'Site Nord', true, 'half', '[]', 1),
    ('repair', 'incident', 'Incident', 'equipment_type', 'Équipement', 'text', 'Machine, groupe froid, baie réseau, véhicule...', 'Groupe froid chambre 2', true, 'half', '[]', 2),
    ('repair', 'incident', 'Incident', 'business_impact', 'Impact opérationnel', 'select', 'Niveau d’impact de l’incident.', null, true, 'half', '["mineur","modere","majeur","bloquant"]', 3),
    ('repair', 'incident', 'Incident', 'temporary_workaround', 'Contournement temporaire', 'textarea', 'Mesures prises en attendant la réparation.', 'Basculer la production sur la chambre 1.', false, 'full', '[]', 4)
) as seed(request_type_code, section_key, section_title, field_key, label, field_type, helper_text, placeholder, required, width, options_json, sort_order)
join public.request_types rt
  on rt.code = seed.request_type_code
on conflict (request_type_id, field_key) do update
set
  section_key = excluded.section_key,
  section_title = excluded.section_title,
  label = excluded.label,
  field_type = excluded.field_type,
  helper_text = excluded.helper_text,
  placeholder = excluded.placeholder,
  required = excluded.required,
  width = excluded.width,
  options_json = excluded.options_json,
  sort_order = excluded.sort_order,
  is_active = true;
