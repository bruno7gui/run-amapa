create function public.pilot_valid_cpf(cpf text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare sum integer; digit integer; n integer; i integer;
begin
  if cpf is null or cpf !~ '^[0-9]{11}$' or cpf ~ '^([0-9])\1{10}$' then return false; end if;
  for n in 9..10 loop
    sum := 0;
    for i in 1..n loop sum := sum + substr(cpf,i,1)::integer * (n+2-i); end loop;
    digit := mod(mod(sum * 10,11),10);
    if digit <> substr(cpf,n+1,1)::integer then return false; end if;
  end loop;
  return true;
end;
$$;
revoke execute on function public.pilot_valid_cpf(text) from public, anon, authenticated;
grant execute on function public.pilot_valid_cpf(text) to service_role;

alter table public.pilot_settings add column responsibility_terms text not null default 'Ao realizar minha inscrição na 2ª Corrida dos Guimarães, declaro que estou em plenas condições físicas e de saúde para participar do evento, assumindo total responsabilidade por minha aptidão para realizar a atividade de corrida ou caminhada.

Participo do evento de forma voluntária, isentando os organizadores, colaboradores, patrocinadores, familiares e o condomínio/local da prova de qualquer responsabilidade por acidentes, quedas, lesões, mal-estar ou danos que possam ocorrer durante minha participação.

Estou ciente de que devo seguir as orientações da organização, respeitar o percurso e agir de forma segura e responsável durante toda a corrida.

Autorizo o uso de minha imagem, fotos e vídeos feitos durante o evento, para fins de divulgação da Corrida dos Guimarães em redes sociais, materiais promocionais e registros oficiais.

Estou ciente de que a organização pode alterar data, horário ou percurso caso ocorram fatores externos que comprometam a segurança do evento (chuva intensa, situações emergenciais, problemas estruturais, etc.).

Concordo que em caso de desistência ou não comparecimento, não haverá reembolso do valor da inscrição, pois os materiais são produzidos antecipadamente.

Declaro que li e concordo com todas as informações, regras e condições da 2ª Corrida dos Guimarães.';

-- Historic registrations remain unchanged; no retroactive consent or personal data is inferred.
alter table public.pilot_registrations
  add column cpf text check (cpf is null or public.pilot_valid_cpf(cpf)),
  add column phone text check (phone ~ '^[1-9]{2}9[0-9]{8}$'),
  add column sex text check (sex in ('feminino','masculino','nao_informado')),
  add column category text check (category in ('familia','amigos')),
  add column accepted_terms text,
  add column terms_accepted_at timestamptz;
create index pilot_registration_cpf on public.pilot_registrations(cpf) where cpf is not null;

create function public.pilot_reserve_full(registration_id uuid, athlete_name text,
  athlete_email text, shirt_size text, dedication_text text, accepted_regulation text,
  athlete_birth_date date, athlete_cpf text, athlete_phone text, athlete_sex text,
  athlete_category text, accepted_terms_text text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare config public.pilot_settings; entry jsonb;
begin
  if not public.pilot_valid_cpf(athlete_cpf) or athlete_phone is null or athlete_phone !~ '^[1-9]{2}9[0-9]{8}$'
    or athlete_sex is null or athlete_sex not in ('feminino','masculino','nao_informado')
    or athlete_category is null or athlete_category not in ('familia','amigos')
    or dedication_text is null or length(trim(dedication_text)) not between 1 and 100 then
    raise exception 'invalid_details';
  end if;
  select * into config from public.pilot_settings where id for update;
  if accepted_terms_text is null or config.responsibility_terms <> accepted_terms_text then
    raise exception 'rules_changed';
  end if;
  update public.pilot_registrations set status='canceled'
    where status='pending' and not checkout_started and created_at <= now()-interval '15 minutes';
  if exists (select from public.pilot_registrations where cpf=athlete_cpf and id<>registration_id
    and status in ('pending','confirmed','review')) then raise exception 'duplicate_cpf'; end if;
  entry := public.pilot_reserve(registration_id,athlete_name,athlete_email,shirt_size,
    dedication_text,accepted_regulation,athlete_birth_date);
  update public.pilot_registrations set cpf=athlete_cpf, phone=athlete_phone,
    sex=athlete_sex, category=athlete_category, accepted_terms=accepted_terms_text, terms_accepted_at=now()
    where id=registration_id and terms_accepted_at is null;
  select to_jsonb(r) into entry from public.pilot_registrations r where id=registration_id;
  return entry;
end;
$$;
revoke execute on function public.pilot_reserve_full(uuid,text,text,text,text,text,date,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.pilot_reserve_full(uuid,text,text,text,text,text,date,text,text,text,text,text)
  to service_role;
