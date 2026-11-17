create table public.pilot_settings (
  id boolean primary key default true check (id),
  is_open boolean not null default false,
  capacity integer not null default 200 check (capacity between 1 and 5000),
  price_cents integer not null default 0 check (price_cents between 0 and 1000000),
  regulation text not null default '',
  check (not is_open or (price_cents > 0 and length(trim(regulation)) > 0))
);

insert into public.pilot_settings default values;

create table public.pilot_registrations (
  id uuid primary key,
  name text not null check (length(name) between 3 and 120),
  email text not null check (length(email) between 5 and 254),
  shirt text not null check (shirt in ('PP','P','M','G','GG','XG')),
  dedication text not null default '' check (length(dedication) <= 100),
  regulation text not null,
  price_cents integer not null check (price_cents > 0),
  created_at timestamptz not null default now(),
  checkout_started boolean not null default false,
  checkout_url text,
  order_id text unique,
  status text not null default 'pending'
    check (status in ('pending','confirmed','canceled','refunded','review')),
  kit_at timestamptz,
  email_sent boolean not null default false
);

create index on public.pilot_registrations (lower(email), status);
alter table public.pilot_settings enable row level security;
alter table public.pilot_registrations enable row level security;
revoke all on public.pilot_settings, public.pilot_registrations from public, anon, authenticated;
grant select, update on public.pilot_settings to service_role;
grant select, insert, update on public.pilot_registrations to service_role;

create function public.pilot_reserve(registration_id uuid, athlete_name text,
    athlete_email text, shirt_size text, dedication_text text, accepted_regulation text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  settings public.pilot_settings;
  existing public.pilot_registrations;
begin
  select * into settings from public.pilot_settings where id for update;
  select * into existing from public.pilot_registrations where id = registration_id;
  if found then return to_jsonb(existing); end if;
  if not settings.is_open then raise exception 'closed'; end if;
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

create function public.pilot_begin_checkout(registration_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  entry public.pilot_registrations;
begin
  perform from public.pilot_settings where id for update;
  update public.pilot_registrations set checkout_started = true
    where id = registration_id and status = 'pending'
      and (checkout_started or created_at > now() - interval '15 minutes')
    returning * into entry;
  if not found then return null; end if;
  return to_jsonb(entry);
end;
$$;

create function public.pilot_payment_status(registration_id uuid, provider_id text, payment_state text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  entry public.pilot_registrations;
begin
  update public.pilot_registrations
    set order_id = coalesce(order_id, provider_id), status = payment_state
    where id = registration_id and checkout_started
      and (order_id is null or order_id = provider_id)
      and (status = payment_state
        or status = 'pending'
        or (status = 'confirmed' and payment_state in ('review','refunded'))
        or (status = 'review' and payment_state = 'refunded'))
    returning * into entry;
  if not found then return null; end if;
  return to_jsonb(entry);
end;
$$;

revoke execute on function public.pilot_reserve(uuid,text,text,text,text,text),
  public.pilot_begin_checkout(uuid), public.pilot_payment_status(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.pilot_reserve(uuid,text,text,text,text,text),
  public.pilot_begin_checkout(uuid), public.pilot_payment_status(uuid,text,text)
  to service_role;
