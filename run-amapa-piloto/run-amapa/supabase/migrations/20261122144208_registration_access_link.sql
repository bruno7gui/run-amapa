alter table public.pilot_registrations add column access_link_requested_at timestamptz;

create function public.pilot_claim_access_link(athlete_email text)
returns jsonb language sql security invoker set search_path = '' as $$
  with latest as (
    select id from public.pilot_registrations
    where email=lower(trim(athlete_email))
    order by created_at desc,id desc limit 1
  ), claimed as (
    update public.pilot_registrations
      set access_link_requested_at=now()
    where id=(select id from latest)
      and (access_link_requested_at is null or access_link_requested_at < now()-interval '10 minutes')
    returning *
  )
  select to_jsonb(claimed) from claimed;
$$;
revoke execute on function public.pilot_claim_access_link(text) from public, anon, authenticated;
grant execute on function public.pilot_claim_access_link(text) to service_role;
