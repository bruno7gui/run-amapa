-- Existing registrations keep a null date until their holder completes it through their signed link.
alter table public.pilot_registrations add column birth_date date
  check (birth_date >= date '1900-01-01' and birth_date <= date '2027-04-11');

-- Keep the six-argument function during deployment for requests already in flight.
create function public.pilot_reserve(registration_id uuid, athlete_name text,
  athlete_email text, shirt_size text, dedication_text text, accepted_regulation text,
  athlete_birth_date date)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare entry jsonb;
begin
  if athlete_birth_date is null or athlete_birth_date < date '1900-01-01' or athlete_birth_date > current_date then
    raise exception 'birth_date';
  end if;
  entry := public.pilot_reserve(registration_id, athlete_name, lower(trim(athlete_email)),
    shirt_size, dedication_text, accepted_regulation);
  update public.pilot_registrations set birth_date=athlete_birth_date
    where id=registration_id and birth_date is null;
  select to_jsonb(r) into entry from public.pilot_registrations r where id=registration_id;
  return entry;
end;
$$;

create function public.pilot_complete_birth_date(registration_id uuid, athlete_birth_date date)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if athlete_birth_date is null or athlete_birth_date < date '1900-01-01' or athlete_birth_date > current_date then
    raise exception 'birth_date';
  end if;
  update public.pilot_registrations set birth_date=athlete_birth_date
    where id=registration_id and birth_date is null;
end;
$$;

-- Shared across serverless instances, including unsuccessful queries. No raw IP addresses stored.
create table public.pilot_lookup_limits (
  key text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table public.pilot_lookup_limits enable row level security;
revoke all on public.pilot_lookup_limits from public, anon, authenticated;
grant select, insert, update, delete on public.pilot_lookup_limits to service_role;

create function public.pilot_lookup_registration(athlete_email text, athlete_birth_date date, request_key text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  total integer;
  result_id uuid;
  scope_key text;
begin
  if request_key is null or request_key !~ '^[a-f0-9]{64}$' then raise exception 'invalid_key'; end if;
  delete from public.pilot_lookup_limits where window_start < now()-interval '1 day';
  -- Apply both limits regardless of whether an email exists or the birth date matches.
  foreach scope_key in array array['ip:' || request_key, 'email:' || md5(lower(trim(athlete_email)))] loop
    insert into public.pilot_lookup_limits as limits (key,window_start,attempts)
      values (scope_key,now(),1)
      on conflict (key) do update set
        attempts=case when limits.window_start <= now()-interval '15 minutes' then 1 else limits.attempts+1 end,
        window_start=case when limits.window_start <= now()-interval '15 minutes' then now() else limits.window_start end
      returning attempts into total;
    if (scope_key like 'ip:%' and total > 100) or (scope_key like 'email:%' and total > 10) then
      return jsonb_build_object('limited',true);
    end if;
  end loop;
  select id into result_id from public.pilot_registrations
    where lower(email)=lower(trim(athlete_email)) and birth_date=athlete_birth_date
    order by created_at desc,id desc limit 1;
  if result_id is null then return null; end if;
  return jsonb_build_object('id',result_id);
end;
$$;

revoke execute on function public.pilot_reserve(uuid,text,text,text,text,text,date),
  public.pilot_complete_birth_date(uuid,date), public.pilot_lookup_registration(text,date,text)
  from public, anon, authenticated;
grant execute on function public.pilot_reserve(uuid,text,text,text,text,text,date),
  public.pilot_complete_birth_date(uuid,date), public.pilot_lookup_registration(text,date,text)
  to service_role;
