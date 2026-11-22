'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentStatus({ id, accessKey, initialStatus, emailSent }) {
  const router = useRouter();
  const [message, setMessage] = useState('Consultando a confirmação do pagamento…');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let stopped = false;
    let timer;
    let attempts = 0;
    const controller = new AbortController();
    async function check() {
      try {
        const response = await fetch('/api/inscricao/status', {
          method: 'POST', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, key: accessKey }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Consulta indisponível');
        const latest = await response.json();
        if (stopped) return;
        if (latest.status !== initialStatus || latest.emailSent !== emailSent) {
          router.refresh();
          return;
        }
        if (latest.status !== 'pending') {
          setMessage('');
          return;
        }
        setMessage(latest.syncFailed
          ? 'A consulta está demorando. Sua inscrição será atualizada após a confirmação do Mercado Pago.'
          : 'Aguardando a confirmação do Mercado Pago. Esta página se atualiza automaticamente.');
      } catch {
        if (stopped) return;
        setMessage('Não foi possível consultar agora. Vamos tentar novamente.');
      }
      attempts += 1;
      if (attempts < 20 && !stopped) timer = setTimeout(check, 15000);
      else if (!stopped) setMessage('O pagamento ainda aguarda confirmação. Você pode consultar novamente ou voltar a este link mais tarde.');
    }
    check();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [id, accessKey, initialStatus, emailSent, retry, router]);
  return <div className="stack" aria-live="polite">
    {message && <p>{message}</p>}
    <button type="button" onClick={() => setRetry(value => value + 1)}>Consultar pagamento</button>
  </div>;
}
