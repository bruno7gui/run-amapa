alter table public.pilot_settings add column closes_at timestamptz;

create or replace function public.pilot_reserve(registration_id uuid, athlete_name text,
    athlete_email text, shirt_size text, dedication_text text, accepted_regulation text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  settings public.pilot_settings;
  existing public.pilot_registrations;
begin
  select * into settings from public.pilot_settings where id for update;
  select * into existing from public.pilot_registrations where id = registration_id;
  if found then return to_jsonb(existing); end if;
  if not settings.is_open or (settings.closes_at is not null and now() >= settings.closes_at) then raise exception 'closed'; end if;
  if settings.regulation <> accepted_regulation then raise exception 'rules_changed'; end if;

  update public.pilot_registrations set status = 'canceled'
    where status = 'pending' and not checkout_started and created_at <= now() - interval '15 minutes';

  if exists (select from public.pilot_registrations
    where email = athlete_email and status in ('pending', 'confirmed', 'review')) then
    raise exception 'duplicate';
  end if;
  if (select count(*) from public.pilot_registrations
    where status in ('pending','confirmed','review')) >= settings.capacity then
    raise exception 'sold_out';
  end if;
  insert into public.pilot_registrations (id, name, email, shirt, dedication, regulation, price_cents)
    values (registration_id, athlete_name, athlete_email, shirt_size, dedication_text, settings.regulation, settings.price_cents)
    returning * into existing;
  return to_jsonb(existing);
end;
$$;

