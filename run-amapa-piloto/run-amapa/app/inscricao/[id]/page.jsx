import { notFound } from 'next/navigation';
import { pay } from '../../actions';
import { db, validRegistration } from '../../../lib/server';
import { labels, money } from '../../../lib/race';

export default async function Status({ params, searchParams }) {
  const { id } = await params;
  const { chave, erro } = await searchParams;
  if (!validRegistration(id, chave)) notFound();
  const [row] = await db('pilot_registrations?id=eq.' + id);
  if (!row) notFound();
  const expired = row.status === 'pending' && !row.checkout_started &&
    Date.now() - new Date(row.created_at).getTime() >= 900000;
  return <section className="wrap section narrow">
    <p className="eyebrow">2ª Corrida dos Guimarães</p>
    <div className="panel stack">
      <h2>{expired ? 'Reserva expirada' : labels[row.status]}</h2>
      <p>Camisa {row.shirt} · {money(row.price_cents)}</p>
      {erro && <p className="notice" role="alert">Não foi possível abrir o checkout. Tente novamente ou fale com a organização.</p>}
      {row.status === 'pending' && !expired && <>
        <p>Guarde o endereço desta página para acompanhar sua inscrição. O pagamento é feito no Mercado Pago.</p>
        <form action={pay}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="key" value={chave} />
          <button className="button">Ir para o pagamento</button>
        </form>
        <a href={'/inscricao/' + id + '?chave=' + chave}>Atualizar situação</a>
      </>}
      <a href="/">Voltar para a corrida</a>
    </div>
  </section>;
}
