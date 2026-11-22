alter table public.pilot_registrations add column payment_checked_at timestamptz,
  add column confirmation_claimed_at timestamptz;

create function public.pilot_claim_payment_check(registration_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with claimed as (
    update public.pilot_registrations set payment_checked_at=now()
    where id=registration_id and order_id is not null
      and (status='pending' or (status='confirmed' and not email_sent))
      and (payment_checked_at is null or payment_checked_at < now()-interval '15 seconds')
    returning id
  )
  select exists(select from claimed);
$$;

revoke execute on function public.pilot_claim_payment_check(uuid) from public, anon, authenticated;
grant execute on function public.pilot_claim_payment_check(uuid) to service_role;

create function public.pilot_claim_confirmation(registration_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with claimed as (
    update public.pilot_registrations set confirmation_claimed_at=now()
    where id=registration_id and status='confirmed' and not email_sent
      and (confirmation_claimed_at is null or confirmation_claimed_at < now()-interval '10 minutes')
    returning id
  )
  select exists(select from claimed);
$$;
revoke execute on function public.pilot_claim_confirmation(uuid) from public, anon, authenticated;
grant execute on function public.pilot_claim_confirmation(uuid) to service_role;
