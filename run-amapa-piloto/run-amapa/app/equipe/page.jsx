import { admin, db, emailConfigured, settings } from '../../lib/server';
import { editKit, refreshPayment, saveSettings, signIn, signOut } from '../actions';
import { categories, sexes, formatCpf, formatPhone } from '../../lib/registration';
import { labels, money } from '../../lib/race';

export default async function Team({ searchParams }) {
  const { erro, salvo, filtro, pagina } = await searchParams;
  if (!await admin()) return <section className="wrap section narrow">
    <div className="panel stack"><h2>Área da equipe</h2>
      {erro && <p className="notice" role="alert">Confira seu e-mail e senha.</p>}
      <form className="stack" action={signIn}>
        <label>E-mail<input type="email" name="email" autoComplete="username" required /></label>
        <label>Senha<input type="password" name="password" autoComplete="current-password" required /></label>
        <button className="button">Entrar</button>
      </form>
    </div>
  </section>;

  const state = Object.hasOwn(labels, filtro) ? filtro : '';
  const page = Math.min(Math.max(Number.parseInt(pagina, 10) || 1, 1), 10000);
  const query = state ? '&status=eq.' + state : '';
  const [race, rows] = await Promise.all([
    settings(),
    db('pilot_registrations?select=id,name,email,birth_date,cpf,phone,sex,category,dedication,terms_accepted_at,shirt,status,kit_at,order_id,price_cents,checkout_started,email_sent&order=created_at.desc,id.desc&limit=51&offset=' + ((page - 1) * 50) + query),
  ]);

  return <section className="wrap section stack">
    <div className="toolbar"><h2>Painel da corrida</h2><form action={signOut}><button>Sair</button></form></div>
    {erro && <p className="notice" role="alert">{erro === 'sincronizar' ?
      'A sincronização falhou. Confira a configuração do Mercado Pago.' :
      'Confira o preço, as vagas, o regulamento e a configuração do checkout antes de abrir.'}</p>}
    {!emailConfigured() && <p className="notice">Envio de confirmação por e-mail pendente de configuração. Para usar Gmail, preencha GMAIL_USER e GMAIL_APP_PASSWORD no Netlify.</p>}
    {salvo && <p className="notice" role="status">Configuração salva.</p>}
    <details className="panel" open>
      <summary>Configurar inscrições</summary>
      <form action={saveSettings} className="stack">
        <label>Vagas<input type="number" name="capacity" min={1} max={5000} defaultValue={race.capacity} required /></label>
        <label>Preço em reais<input name="price" inputMode="decimal" defaultValue={(race.price_cents / 100).toFixed(2)} required /></label>
        <label>Regulamento<textarea name="regulation" defaultValue={race.regulation} rows={6} maxLength={30000} /></label>
        <label className="check"><input type="checkbox" name="open" defaultChecked={race.is_open} /> Abrir inscrições</label>
        <button className="button">Salvar configuração</button>
      </form>
    </details>
    <div className="panel stack">
      <div className="toolbar"><h3>Atletas inscritos</h3><a href="/api/equipe/exportar">Baixar CSV</a></div>
      <form className="toolbar">
        <label>Situação<select name="filtro" defaultValue={state}>
          <option value="">Todas</option>{Object.entries(labels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
        </select></label><button>Filtrar</button>
      </form>
      {rows.length ? <div className="table-scroll"><table>
        <thead><tr><th>Atleta</th><th>Camisa</th><th>Pagamento</th><th>Kit</th></tr></thead>
        <tbody>{rows.slice(0, 50).map(row => <tr key={row.id}>
          <td>{row.name}<br/><small>{row.email}</small>
            <details><summary>Dados do cadastro</summary><dl>
              <dt>Nascimento</dt><dd>{row.birth_date?.split('-').reverse().join('/') || 'Não informado'}</dd>
              <dt>CPF</dt><dd>{formatCpf(row.cpf)}</dd>
              <dt>Celular</dt><dd>{formatPhone(row.phone)}</dd>
              <dt>Sexo</dt><dd>{sexes[row.sex] || 'Não informado'}</dd>
              <dt>Categoria</dt><dd>{categories[row.category] || 'Não informada'}</dd>
              <dt>Seu laço</dt><dd>{row.dedication || 'Não informado'}</dd>
              <dt>Aceite do termo</dt><dd>{row.terms_accepted_at ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(row.terms_accepted_at)) : 'Não registrado nesta versão'}</dd>
            </dl></details>
          </td>
          <td>{row.shirt}</td>
          <td>{labels[row.status]} · {money(row.price_cents)}
            {row.status === 'confirmed' && <p><small>{row.email_sent ? 'Confirmação enviada por e-mail' : 'E-mail de confirmação pendente'}</small></p>}
            {row.order_id && <form action={refreshPayment}>
              <input type="hidden" name="id" value={row.id} /><button>Sincronizar</button>
            </form>}
          </td>
          <td>{(row.kit_at || row.status === 'confirmed') && <form action={editKit}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="undo" value={row.kit_at ? '1' : '0'} />
            <button>{row.kit_at ? 'Desfazer retirada' : 'Registrar retirada'}</button>
          </form>}</td>
        </tr>)}</tbody>
      </table></div> : <p>Nenhuma inscrição encontrada.</p>}
      <div className="toolbar">
        {page > 1 && <a href={'?filtro=' + state + '&pagina=' + (page - 1)}>Anterior</a>}
        {rows.length > 50 && <a href={'?filtro=' + state + '&pagina=' + (page + 1)}>Próxima</a>}
      </div>
    </div>
  </section>;
}
