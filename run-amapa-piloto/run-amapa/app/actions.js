'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { admin, authCookie, canRegister, createOrder, db, isId, login, reconcile,
  registrationPath, sendAccessLink, settings, site, validRegistration } from '../lib/server';
import { shirts } from '../lib/race';

const value = (form, field) => String(form.get(field) || '').trim();

export async function register(form) {
  const id = value(form, 'id');
  const key = value(form, 'key');
  const name = value(form, 'name');
  const email = value(form, 'email').toLowerCase();
  const shirt = value(form, 'shirt');
  const dedication = value(form, 'dedication');
  const regulation = value(form, 'regulation');
  if (!validRegistration(id, key) || name.length < 3 || name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    !shirts.includes(shirt) || dedication.length > 100 || form.get('accept') !== 'on') {
    redirect('/?erro=dados#inscricao');
  }
  try {
    if (!canRegister(await settings())) throw Object.assign(new Error(), { detail: 'closed' });
    await db('rpc/pilot_reserve', { method: 'POST', body: {
      registration_id: id, athlete_name: name, athlete_email: email, shirt_size: shirt,
      dedication_text: dedication, accepted_regulation: regulation,
    } });
  } catch (error) {
    const detail = ['closed', 'rules_changed', 'sold_out', 'duplicate'].includes(error.detail)
      ? error.detail : 'indisponivel';
    redirect('/?erro=' + detail + '#inscricao');
  }
  redirect(registrationPath(id));
}

export async function pay(form) {
  const id = value(form, 'id');
  const key = value(form, 'key');
  if (!validRegistration(id, key)) redirect('/');
  let url;
  try {
    const row = await db('rpc/pilot_begin_checkout', { method: 'POST', body: { registration_id: id } });
    if (!row || !process.env.MERCADO_PAGO_ACCESS_TOKEN) throw new Error('Checkout indisponível');
    if (row.order_id?.startsWith('ORDTST')) {
      throw Object.assign(new Error('Pedido de teste'), { code: 'test_credentials' });
    }
    url = row.checkout_url || await createOrder(row);
  } catch (error) {
    redirect(registrationPath(id) + '&erro=' + (error.code === 'test_credentials' ? 'ambiente' : '1'));
  }
  redirect(url);
}

export async function signIn(form) {
  try {
    await login(value(form, 'email').toLowerCase(), String(form.get('password') || ''));
  } catch {
    redirect('/equipe?erro=login');
  }
  redirect('/equipe');
}

export async function signOut() {
  (await cookies()).delete(authCookie);
  redirect('/equipe');
}

export async function saveSettings(form) {
  if (!await admin()) redirect('/equipe');
  const capacity = Number(value(form, 'capacity'));
  const price = value(form, 'price').replace(',', '.');
  const priceCents = Math.round(Number(price) * 100);
  const regulation = value(form, 'regulation');
  const open = form.get('open') === 'on';
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 5000 ||
    !/^\d{1,5}(\.\d{1,2})?$/.test(price) || priceCents > 1000000 ||
    regulation.length > 30000 || (open && !canRegister({ is_open: true, regulation, price_cents: priceCents }))) {
    redirect('/equipe?erro=config');
  }
  try {
    await db('pilot_settings?id=eq.true', { method: 'PATCH', body: {
      capacity, price_cents: priceCents, regulation, is_open: open,
    } });
  } catch {
    redirect('/equipe?erro=config');
  }
  revalidatePath('/');
  redirect('/equipe?salvo=1');
}

export async function editKit(form) {
  if (!await admin()) redirect('/equipe');
  const id = value(form, 'id');
  if (!isId(id)) redirect('/equipe');
  const remove = value(form, 'undo') === '1';
  await db('pilot_registrations?id=eq.' + id + (remove ? '' : '&status=eq.confirmed&kit_at=is.null'), {
    method: 'PATCH', body: { kit_at: remove ? null : new Date().toISOString() },
  });
  revalidatePath('/equipe');
}

export async function refreshPayment(form) {
  if (!await admin()) redirect('/equipe');
  const id = value(form, 'id');
  if (!isId(id)) redirect('/equipe');
  const [row] = await db('pilot_registrations?id=eq.' + id);
  if (row?.order_id) {
    try { await reconcile(row.order_id); }
    catch { redirect('/equipe?erro=sincronizar'); }
  }
  revalidatePath('/equipe');
}

export async function recoverRegistration(form) {
  const email = value(form, 'email').toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/acompanhar?erro=email');
  }
  try {
    await sendAccessLink(email);
  } catch {
    redirect('/acompanhar?erro=envio');
  }
  redirect('/acompanhar?enviado=1');
}

export async function openRegistration(form) {
  let destination;
  try {
    const url = new URL(value(form, 'link'), site());
    const id = url.pathname.match(/^\/inscricao\/([^/]+)$/)?.[1];
    const key = url.searchParams.get('chave');
    if (url.origin !== new URL(site()).origin || !validRegistration(id, key)) {
      throw new Error('Link inválido');
    }
    destination = registrationPath(id);
  } catch {
    redirect('/acompanhar?erro=link');
  }
  redirect(destination);
}
