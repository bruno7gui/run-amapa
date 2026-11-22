import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { title, money } from './race';

const base = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const authCookie = 'run-amapa-team';
export const site = () => process.env.SITE_URL || 'http://localhost:3000';

async function jsonRequest(url, options) {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error('Falha na integração'), {
    code: data?.code,
    detail: data?.message,
    status: response.status,
  });
  return data;
}

export function db(path, { method = 'GET', body } = {}) {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key || !base()) throw new Error('Supabase sem configuração');
  return jsonRequest(new URL('/rest/v1/' + path, base()), {
    method,
    headers: { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function settings() {
  const [race] = await db('pilot_settings?id=eq.true&select=*');
  return race;
}

export function canRegister(race) {
  return Boolean(race?.is_open && (!race.closes_at || Date.now() < Date.parse(race.closes_at)) && race.regulation && race.price_cents > 0 &&
    process.env.REGISTRATION_LINK_SECRET?.length >= 32 &&
    process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.MERCADO_PAGO_WEBHOOK_SECRET);
}

export async function admin() {
  const token = (await cookies()).get(authCookie)?.value;
  if (!token) return null;
  try {
    const user = await jsonRequest(new URL('/auth/v1/user', base()), {
      headers: { apikey: publicKey(), Authorization: 'Bearer ' + token },
    });
    return user.email_confirmed_at && allowed(user.email) ? user : null;
  } catch {
    return null;
  }
}

function allowed(email) {
  return Boolean(email && process.env.PILOT_ADMIN_EMAILS?.split(',')
    .some(entry => entry.trim().toLowerCase() === email.toLowerCase()));
}

export async function login(email, password) {
  if (!allowed(email)) throw new Error('Credenciais inválidas');
  const session = await jsonRequest(new URL('/auth/v1/token?grant_type=password', base()), {
    method: 'POST',
    headers: { apikey: publicKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!session.user?.email_confirmed_at) throw new Error('E-mail pendente');
  (await cookies()).set(authCookie, session.access_token, {
    httpOnly: true, sameSite: 'lax', secure: site().startsWith('https:'),
    path: '/', maxAge: session.expires_in,
  });
}

function digest(secret, value) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function matches(expected, actual) {
  return typeof actual === 'string' && /^[a-f0-9]{64}$/.test(actual) &&
    timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}

export const isId = id => typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);

export function registrationPath(id) {
  return '/inscricao/' + id + '?chave=' + digest(process.env.REGISTRATION_LINK_SECRET, id);
}

export function validRegistration(id, key) {
  const secret = process.env.REGISTRATION_LINK_SECRET;
  return Boolean(secret && isId(id) && matches(digest(secret, id), key));
}

function mercadoPago(path, options = {}) {
  return jsonRequest(new URL('/v1/orders' + path, 'https://api.mercadopago.com'), {
    ...options,
    headers: {
      Authorization: 'Bearer ' + process.env.MERCADO_PAGO_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function createOrder(row) {
  const url = new URL(registrationPath(row.id) + '&retorno=1', site()).href;
  const amount = (row.price_cents / 100).toFixed(2);
  const order = await mercadoPago('', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': row.id },
    body: JSON.stringify({
      type: 'online', processing_mode: 'manual', capture_mode: 'automatic_async',
      external_reference: row.id, total_amount: amount,
      expiration_time: 'PT30M', payer: { email: row.email },
      items: [{ title, unit_price: amount, quantity: 1 }],
      config: { online: { success_url: url, failure_url: url, pending_url: url, auto_return: 'all' } },
    }),
  });
  if (order.live_mode === false || order.id?.startsWith('ORDTST')) {
    throw Object.assign(new Error('Credenciais de teste'), { code: 'test_credentials' });
  }
  const checkout = new URL(order.checkout_url);
  if (!/^ORD[A-Za-z0-9]+$/.test(order.id) || checkout.protocol !== 'https:' ||
      !['www.mercadopago.com.br', 'mercadopago.com.br'].includes(checkout.hostname)) {
    throw new Error('Checkout inesperado');
  }
  await db('pilot_registrations?id=eq.' + row.id + '&order_id=is.null', {
    method: 'PATCH', body: { order_id: order.id, checkout_url: checkout.href },
  });
  return checkout.href;
}

export function webhookOrderId(request) {
  const id = new URL(request.url).searchParams.get('data.id');
  const requestId = request.headers.get('x-request-id');
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const parameters = new URLSearchParams(
    (request.headers.get('x-signature') || '').replace(/,\s*/g, '&'),
  );
  const ts = parameters.get('ts');
  if (!secret || !/^ORD[A-Za-z0-9]+$/i.test(id || '') || !requestId || !/^\d{10,13}$/.test(ts || '')) return null;
  const manifest = 'id:' + id.toLowerCase() + ';request-id:' + requestId + ';ts:' + ts + ';';
  return matches(digest(secret, manifest), parameters.get('v1')) ? id : null;
}

export async function reconcile(orderId) {
  if (!/^ORD[A-Za-z0-9]+$/i.test(orderId)) throw new Error('Order inválida');
  const order = await mercadoPago('/' + encodeURIComponent(orderId));
  if (!isId(order.external_reference)) return;
  const [row] = await db('pilot_registrations?id=eq.' + order.external_reference);
  if (!row || (row.order_id && row.order_id.toLowerCase() !== orderId.toLowerCase())) return;
  if (Math.round(Number(order.total_amount) * 100) !== row.price_cents) throw new Error('Valor divergente');
  let state;
  if (order.status_detail === 'partially_refunded' || order.status === 'charged_back') state = 'review';
  else if (order.status === 'processed' && order.status_detail === 'accredited') {
    state = Math.round(Number(order.total_paid_amount) * 100) === row.price_cents ? 'confirmed' : 'review';
  } else if (order.status === 'refunded') state = 'refunded';
  else if (['expired', 'canceled'].includes(order.status)) state = 'canceled';
  else return;

  const updated = await db('rpc/pilot_payment_status', {
    method: 'POST', body: { registration_id: row.id, provider_id: order.id, payment_state: state },
  });
  if (updated?.status === 'confirmed') await sendConfirmation(updated);
}

export function emailConfigured() {
  return Boolean((process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) ||
    (process.env.RESEND_API_KEY && process.env.CONFIRMATION_FROM));
}

async function sendConfirmation(row) {
  if (row.email_sent || !emailConfigured()) return;
  const claimed = await db('rpc/pilot_claim_confirmation', {
    method: 'POST', body: { registration_id: row.id },
  });
  if (!claimed) return;
  const url = new URL(registrationPath(row.id), site()).href;
  const email = {
    to: row.email,
    subject: 'Inscrição confirmada | ' + title,
    text: [
      'Olá, ' + row.name + '!',
      'Sua inscrição na ' + title + ' está confirmada.',
      'Data: 11/04/2027 · Percurso: 5 km',
      'Local: Residencial Parque Irmãos Platon, Macapá (AP)',
      'Participante: ' + row.name,
      'Camisa: ' + row.shirt,
      'Pagamento confirmado: ' + money(row.price_cents),
      'Código da inscrição: ' + row.id,
      'Acompanhe sua inscrição: ' + url,
      'Guarde este e-mail e o link para consultar sua inscrição.',
    ].join('\n\n'),
  };
  try {
    await deliverEmail(email, 'confirm-' + row.id);
    await db('pilot_registrations?id=eq.' + row.id, {
      method: 'PATCH', body: { email_sent: true, confirmation_claimed_at: null },
    });
  } catch (error) {
    await db('pilot_registrations?id=eq.' + row.id, {
      method: 'PATCH', body: { confirmation_claimed_at: null },
    });
    throw error;
  }
}

async function deliverEmail(email, idempotencyKey) {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const { default: nodemailer } = await import('nodemailer');
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
    });
    const sent = await transport.sendMail({
      ...email,
      from: { name: 'Corrida dos Guimarães', address: process.env.GMAIL_USER },
      messageId: '<' + idempotencyKey + '@' + new URL(site()).hostname + '>',
      disableFileAccess: true, disableUrlAccess: true,
    });
    if (!sent.accepted?.length) throw new Error('O provedor recusou o e-mail');
  } else {
    const sent = await jsonRequest('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ ...email, from: process.env.CONFIRMATION_FROM, to: [email.to] }),
    });
    if (!sent?.id) throw new Error('O provedor não confirmou o envio');
  }
}

export async function sendAccessLink(email) {
  if (!emailConfigured()) throw new Error('Envio indisponível');
  const row = await db('rpc/pilot_claim_access_link', {
    method: 'POST', body: { athlete_email: email },
  });
  if (!row) return;
  const url = new URL(registrationPath(row.id), site()).href;
  try {
    await deliverEmail({
      to: row.email,
      subject: 'Acompanhe sua inscrição | ' + title,
      text: [
        'Olá, ' + row.name + '!',
        'Acesse o link abaixo para acompanhar sua inscrição na ' + title + '.',
        url,
        'Você poderá consultar o pagamento e o comprovante da inscrição nesta página.',
        'Se você não solicitou este acesso, pode ignorar esta mensagem.',
      ].join('\n\n'),
    }, 'access-' + row.id + '-' + Date.parse(row.access_link_requested_at));
  } catch (error) {
    await db('pilot_registrations?id=eq.' + row.id, {
      method: 'PATCH', body: { access_link_requested_at: null },
    });
    throw error;
  }
}
