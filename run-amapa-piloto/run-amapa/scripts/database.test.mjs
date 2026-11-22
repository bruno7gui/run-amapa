import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrations = new URL('../supabase/migrations/', import.meta.url);
const [migration] = await readdir(migrations);
const schema = await readFile(new URL(migration, migrations), 'utf8');
const regulation = 'Regulamento de teste';
const first = '9aeeeb81-be51-4f29-b031-433ae0360220';
const second = 'c222848c-345f-4a0e-9312-b3832b2d7efa';

test('reserva, limite de vagas, pagamento, estorno e isolamento por função', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(schema);
    for (const name of (await readdir(migrations)).sort().slice(1)) {
      await db.exec(await readFile(new URL(name, migrations), 'utf8'));
    }
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.pilot_registrations'), /permission denied/);
    await db.exec('set role service_role');

    const reserve = (id, email, rules = regulation, birthDate = '1990-01-02') =>
      db.query('select public.pilot_reserve($1,$2,$3,$4,$5,$6,$7::date) as entry',
        [id, 'Atleta Teste', email, 'M', '', rules, birthDate]);
    await assert.rejects(reserve(first, 'a@example.com'), /closed/);
    await db.query('update public.pilot_settings set capacity=1, price_cents=1000, regulation=$1, is_open=true', [regulation]);
    await assert.rejects(reserve(first, 'a@example.com', 'Versão anterior'), /rules_changed/);
    await db.query("update public.pilot_settings set closes_at=now()-interval '1 minute'");
    await assert.rejects(reserve(first, 'a@example.com'), /closed/);
    await db.query('update public.pilot_settings set closes_at=null');
    const { rows } = await reserve(first, 'a@example.com');
    assert.equal(rows[0].entry.status, 'pending');
    await reserve(first, 'a@example.com');
    await assert.rejects(reserve(second, 'b@example.com'), /sold_out/);

    await db.query('select public.pilot_begin_checkout($1)', [first]);
    const update = async (order, state) => (await db.query(
      'select public.pilot_payment_status($1,$2,$3) as entry', [first, order, state],
    )).rows[0].entry;
    assert.equal((await update('ORDTESTA', 'confirmed')).status, 'confirmed');
    assert.equal((await update('ORDTESTA', 'confirmed')).status, 'confirmed');
    const claimCheck = async () => (await db.query(
      'select public.pilot_claim_payment_check($1) as claimed', [first],
    )).rows[0].claimed;
    assert.equal(await claimCheck(), true);
    assert.equal(await claimCheck(), false);
    const claimEmail = async () => (await db.query(
      'select public.pilot_claim_confirmation($1) as claimed', [first],
    )).rows[0].claimed;
    assert.equal(await claimEmail(), true);
    assert.equal(await claimEmail(), false);
    await db.query('update public.pilot_registrations set email_sent=true where id=$1', [first]);
    assert.equal(await claimEmail(), false);
    assert.equal(await update('ORDTESTB', 'refunded'), null);
    assert.equal((await update('ORDTESTA', 'refunded')).status, 'refunded');
    assert.equal(await update('ORDTESTA', 'confirmed'), null);
    assert.equal((await reserve(second, 'b@example.com')).rows[0].entry.status, 'pending');
    const claimAccess = async email => (await db.query(
      'select public.pilot_claim_access_link($1) as entry', [email],
    )).rows[0].entry;
    assert.equal(await claimAccess('unknown@example.com'), null);
    assert.equal((await claimAccess(' B@EXAMPLE.COM ')).id, second);
    assert.equal(await claimAccess('b@example.com'), null);
    const lookup = async (email, date = '1990-01-02', key = 'a'.repeat(64)) => (await db.query(
      'select public.pilot_lookup_registration($1,$2::date,$3) as result', [email, date, key],
    )).rows[0].result;
    assert.equal((await lookup(' B@EXAMPLE.COM ')).id, second);
    assert.equal(await lookup('b@example.com', '1990-01-03'), null);
    assert.equal(await lookup('unknown@example.com'), null);
    // Replays cannot overwrite a previously saved birth date.
    await reserve(second, 'b@example.com', regulation, '1980-02-03');
    assert.equal((await lookup('b@example.com')).id, second);
    assert.equal(await lookup('b@example.com', '1980-02-03'), null);
    await assert.rejects(reserve(second, 'b@example.com', regulation, '2999-01-01'), /birth_date/);
    await assert.rejects(reserve(second, 'b@example.com', regulation, null), /birth_date/);
    // Older entries require possession of the existing signed link to complete their date.
    await db.query('update public.pilot_registrations set birth_date=null where id=$1', [first]);
    assert.equal(await lookup('a@example.com'), null);
    await db.query('select public.pilot_complete_birth_date($1,$2)', [first, '1990-01-02']);
    await db.query('select public.pilot_complete_birth_date($1,$2)', [first, '1980-01-02']);
    assert.equal((await lookup('a@example.com')).id, first);
    for (let attempt = 0; attempt < 10; attempt++) await lookup('missing@example.com');
    assert.equal((await lookup('missing@example.com', '1990-01-02', 'b'.repeat(64))).limited, true);
    await db.query("update public.pilot_lookup_limits set window_start=now()-interval '16 minutes'");
    assert.equal(await lookup('missing@example.com'), null);
    const terms = (await db.query('select responsibility_terms from public.pilot_settings')).rows[0].responsibility_terms;
    const full = async (cpf = '52998224725', category = 'familia', accepted = terms) => (await db.query(
      'select public.pilot_reserve_full($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,$11,$12) as entry',
      [second, 'Atleta Teste', 'b@example.com', 'M', 'Minha família', regulation, '1990-01-02', cpf, '96999999999', 'feminino', category, accepted],
    )).rows[0].entry;
    await assert.rejects(full('11111111111'), /invalid_details/);
    await assert.rejects(full('52998224725', 'outra'), /invalid_details/);
    await assert.rejects(full('52998224725', 'familia', 'Versão anterior'), /rules_changed/);
    const registered = await full();
    assert.equal(registered.cpf, '52998224725');
    assert.equal(registered.phone, '96999999999');
    assert.equal(registered.sex, 'feminino');
    assert.equal(registered.category, 'familia');
    assert.equal(registered.dedication, ''); // Existing registration data is not rewritten on a replay.
    assert.equal(registered.accepted_terms, terms);
    assert.ok(registered.terms_accepted_at);
    assert.equal((await full('52998224725', 'amigos')).category, 'familia');
    await assert.rejects(db.query(
      'select public.pilot_reserve_full($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,$11,$12)',
      [first, 'Atleta Teste', 'a@example.com', 'M', 'Minha família', regulation, '1990-01-02', '52998224725', '96999999999', 'masculino', 'amigos', terms],
    ), /duplicate_cpf/);
    // A fresh reservation stores all nine fields and the consent atomically.
    await db.query('update public.pilot_settings set capacity=2');
    const third = 'b472b5f9-e403-4436-a837-cc519b55d120';
    const fresh = (await db.query(
      'select public.pilot_reserve_full($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,$11,$12) as entry',
      [third, 'Outro Atleta', 'c@example.com', 'XXG', 'Prefiro não informar ou não vou correr por ninguém.', regulation, '1991-03-04', '11144477735', '96988887777', 'nao_informado', 'amigos', terms],
    )).rows[0].entry;
    assert.equal(fresh.category, 'amigos');
    assert.equal(fresh.dedication, 'Prefiro não informar ou não vou correr por ninguém.');
    assert.equal(fresh.shirt, 'XXG');
    assert.equal(fresh.birth_date, '1991-03-04');
    assert.equal(fresh.accepted_terms, terms);
    await db.exec('set role anon');
    await assert.rejects(full(), /permission denied/);
    await assert.rejects(lookup('a@example.com'), /permission denied/);
    await assert.rejects(db.query('select * from public.pilot_lookup_limits'), /permission denied/);
    await assert.rejects(db.query('select public.pilot_complete_birth_date($1,$2)', [first, '1990-01-02']), /permission denied/);
    await assert.rejects(claimAccess('a@example.com'), /permission denied/);
  } finally { await db.close(); }
});
