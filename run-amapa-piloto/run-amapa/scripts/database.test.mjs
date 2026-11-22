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

    const reserve = (id, email, rules = regulation) =>
      db.query('select public.pilot_reserve($1,$2,$3,$4,$5,$6) as entry',
        [id, 'Atleta Teste', email, 'M', '', rules]);
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
  } finally { await db.close(); }
});
