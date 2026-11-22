import { db, reconcile, validRegistration } from '../../../../lib/server';

export async function POST(request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: 'Solicitação inválida.' }, { status: 400, headers });
  }
  if (!validRegistration(data?.id, data?.key)) {
    return Response.json({ error: 'Link inválido.' }, { status: 404, headers });
  }
  try {
    const claimed = await db('rpc/pilot_claim_payment_check', {
      method: 'POST', body: { registration_id: data.id },
    });
    const [row] = await db('pilot_registrations?id=eq.' + data.id);
    if (!row) return new Response(null, { status: 404, headers });
    let syncFailed = false;
    if (claimed && row.order_id) {
      try { await reconcile(row.order_id); }
      catch { syncFailed = true; }
    }
    const [latest] = await db('pilot_registrations?id=eq.' + data.id);
    return Response.json({
      status: latest.status, emailSent: latest.email_sent, syncFailed,
    }, { headers });
  } catch {
    return Response.json({ error: 'Não foi possível consultar o pagamento agora.' }, { status: 503, headers });
  }
}
