alter table public.pilot_registrations drop constraint pilot_registrations_shirt_check,
  add constraint pilot_registrations_shirt_check check (shirt in ('PP','P','M','G','GG','XG','XXG'));
