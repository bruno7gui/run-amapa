import { reconcile, webhookOrderId } from '../../../lib/server';

export async function POST(request) {
  const orderId = webhookOrderId(request);
  if (!orderId) return new Response(null, { status: 401 });
  try {
    await reconcile(orderId);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
