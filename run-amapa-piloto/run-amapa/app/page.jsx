import { randomUUID } from 'node:crypto';
import { register } from './actions';
import { canRegister, registrationPath, settings } from '../lib/server';
import { money, shirts } from '../lib/race';

export const dynamic = 'force-dynamic';

const errors = {
  dados: 'Confira seus dados e aceite o regulamento.',
  closed: 'As inscrições estão fechadas.',
  rules_changed: 'O regulamento foi atualizado. Leia a nova versão e envie o formulário novamente.',
  sold_out: 'As vagas estão preenchidas ou reservadas no momento.',
  duplicate: 'Já existe uma inscrição ativa com esse e-mail. Use o link da inscrição ou fale com a organização.',
  indisponivel: 'Não foi possível reservar sua vaga. Tente novamente em instantes.',
};

export default async function Page({ searchParams }) {
  const { erro } = await searchParams;
  const race = await settings().catch(() => null);
  const open = canRegister(race);
  const id = open && randomUUID();
  return <>
    <section className="hero"><div className="wrap hero-inner">
      <p className="eyebrow">2ª edição · Macapá, AP</p>
      <h1>Corrida dos<br />Guimarães<span>.</span></h1>
      <p className="theme">Laços que nos movem</p>
      <a className="button" href="#inscricao">{open ? 'Fazer inscrição' : 'Ver inscrições'}</a>
      <div className="facts">
        <div><span>Data</span><strong>11 de abril de 2027</strong></div>
        <div><span>Percurso</span><strong>5 km</strong></div>
        <div><span>Local</span><strong>Res. Parque Irmãos Platon</strong></div>
      </div>
    </div></section>
    <section id="inscricao" className="wrap section two">
      <div><p className="eyebrow">Inscrições</p><h2>Por quem você vai correr?</h2>
        <p>Se quiser, dedique seus 5 km a alguém e registre a homenagem na sua inscrição.</p></div>
      <div className="panel">
        {Object.hasOwn(errors, erro) && <p className="notice" role="alert">{errors[erro]}</p>}
        {open && race.regulation.startsWith('TESTE TEMPORÁRIO') && <p className="notice">Teste do site até 17/11 às 23h59 (Brasília). Valor temporário de R$ 1,00. Esta inscrição não garante vaga no evento.</p>}
        {open ? <form action={register} className="stack">
          <h3>Inscrição individual <small>{money(race.price_cents)}</small></h3>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="key" value={registrationPath(id).split('=')[1]} />
          <input type="hidden" name="regulation" value={race.regulation} />
          <label>Nome completo<input name="name" autoComplete="name" minLength={3} maxLength={120} required /></label>
          <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label>Tamanho da camisa<select name="shirt" defaultValue="" required>
            <option value="" disabled>Selecione</option>{shirts.map(shirt => <option key={shirt}>{shirt}</option>)}
          </select></label>
          <label>Dedico meus 5 km a… <span className="muted">(opcional)</span><input name="dedication" maxLength={100} /></label>
          <details><summary>Leia o regulamento</summary><div className="rules">{race.regulation}</div></details>
          <label className="check"><input type="checkbox" name="accept" required /> Li e aceito o regulamento.</label>
          <button className="button">Reservar vaga</button>
        </form> : <><h3>Inscrições fechadas</h3><p>A abertura será divulgada pela organização da corrida.</p></>}
      </div>
    </section>
  </>;
}
