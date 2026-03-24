-- Seed safe a rejouer pour le developpement local.
-- Les referentiels principaux sont deja poses par les migrations.

insert into public.notification_preferences (user_id)
select p.id
from public.profiles p
on conflict (user_id) do nothing;

update public.profiles
set display_name = coalesce(display_name, split_part(email, '@', 1)),
    username = coalesce(username, lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g')))
where email is not null;
