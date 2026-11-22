import { notFound } from 'next/navigation';
import { completeBirthDate, pay } from '../../actions';
import { db, validRegistration } from '../../../lib/server';
import { labels, money, raceDate } from '../../../lib/race';
import { categories } from '../../../lib/registration';
import PaymentStatus from './payment-status';

export default async function Status({ params, searchParams }) {
  const { id } = await params;
  const { chave, erro } = await searchParams;
  if (!validRegistration(id, chave)) notFound();
  const [row] = await db('pilot_registrations?id=eq.' + id);
  if (!row) notFound();
  const expired = row.status === 'pending' && !row.checkout_started &&
    Date.now() - new Date(row.created_at).getTime() >= 900000;
  const confirmed = row.status === 'confirmed';
  return <section className="wrap section narrow">
    <p className="eyebrow">2ª Corrida dos Guimarães</p>
    <div className="panel stack">
      <h2>{expired ? 'Reserva expirada' : labels[row.status]}</h2>
      {confirmed && <p role="status">Pagamento aprovado. Sua inscrição foi efetivada!</p>}
      <dl>
        <dt>Participante</dt><dd>{row.name}</dd>
        <dt>Categoria</dt><dd>{categories[row.category] || 'Não informada'}</dd>
        <dt>Seu laço</dt><dd>{row.dedication || 'Não informado'}</dd>
        <dt>Camisa</dt><dd>{row.shirt}</dd>
        <dt>Valor</dt><dd>{money(row.price_cents)}</dd>
        <dt>Código da inscrição</dt><dd style={{ overflowWrap: 'anywhere' }}>{row.id}</dd>
      </dl>
      {confirmed && <>
        <p>{raceDate.note}: {raceDate.label} · 5 km · Residencial Parque Irmãos Platon, Macapá (AP).</p>
        {row.email_sent && <p>O e-mail de confirmação foi enviado para {row.email}. Confira também a pasta de spam.</p>}
        <p>Guarde o endereço desta página como comprovante da sua inscrição.</p>
      </>}
      {erro && <p className="notice" role="alert">{erro === 'nascimento' ? 'Não foi possível salvar a data de nascimento. Confira o dado e tente novamente.' : erro === 'ambiente'
        ? 'O pagamento real aguarda a ativação pela organização. Se esta inscrição foi criada no teste, faça uma nova inscrição após a ativação.'
        : 'Não foi possível abrir o checkout. Tente novamente ou fale com a organização.'}</p>}
      {row.status === 'pending' && !expired && <>
        <p>Guarde o endereço desta página para acompanhar sua inscrição. O pagamento é feito no Mercado Pago.</p>
        <form action={pay}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="key" value={chave} />
          <button className="button">Ir para o pagamento</button>
        </form>
      </>}
      {row.order_id && (row.status === 'pending' || (confirmed && !row.email_sent)) &&
        <PaymentStatus id={id} accessKey={chave} initialStatus={row.status} emailSent={row.email_sent} />}
      {!row.birth_date && <form action={completeBirthDate} className="stack lookup-divider">
        <h3>Complete seu cadastro</h3>
        <p>Adicione sua data de nascimento para consultar a inscrição com e-mail e data de nascimento nas próximas visitas.</p>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="key" value={chave} />
        <label>Data de nascimento<input type="date" name="birth_date" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required /></label>
        <button className="button">Salvar data de nascimento</button>
      </form>}
      <a href="/">Voltar para a corrida</a>
    </div>
  </section>;
}
