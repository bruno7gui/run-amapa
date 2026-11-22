import { randomUUID } from 'node:crypto';
import { register } from './actions';
import { CpfInput, PhoneInput } from './identity-inputs';
import { categories, sexes } from '../lib/registration';
import { canRegister, registrationPath, settings } from '../lib/server';
import { money, shirts } from '../lib/race';

export const dynamic = 'force-dynamic';

const errors = {
  dados: 'Confira seus dados e aceite o regulamento.',
  closed: 'As inscrições estão fechadas.',
  rules_changed: 'O regulamento ou o termo foi atualizado. Leia a nova versão e envie o formulário novamente.',
  sold_out: 'As vagas estão preenchidas ou reservadas no momento.',
  duplicate: 'Já existe uma inscrição ativa com esse e-mail. Use Acompanhar inscrição para recuperar seu link.',
  duplicate_cpf: 'Já existe uma inscrição ativa com esse CPF. Use Acompanhar inscrição para consultar o cadastro.',
  indisponivel: 'Não foi possível reservar sua vaga. Tente novamente em instantes.',
};

const shortcuts = [
  { label: 'Fazer inscrição', href: '#inscricao', primary: true },
  { label: 'Acompanhar inscrição', href: '/acompanhar' },
  { label: 'Sobre a Corrida', href: '#sobre' },
  { label: 'Percurso', href: '#percurso' },
  { label: 'Regulamento', href: '#regulamento' },
  { label: 'Dúvidas frequentes', href: '#duvidas' },
];

export default async function Page({ searchParams }) {
  const { erro } = await searchParams;
  const race = await settings().catch(() => null);
  const open = canRegister(race);
  const id = open && randomUUID();
  const closingDate = race?.closes_at && new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long', timeZone: 'America/Sao_Paulo',
  }).format(new Date(Date.parse(race.closes_at) - 1));

  return <>
    <section className="hero">
      <div className="wrap hero-inner">
        <div className="hero-heading">
          <div>
            <p className="eyebrow">2ª edição · 11 de abril de 2027</p>
            <h1><span className="title-intro">Corrida dos</span>Guimarães</h1>
            <p className="theme">Laços que nos movem</p>
          </div>
          <img className="emblem emblem-hero" src="/images/logo-oficial.webp" width="1254" height="1254" alt="Logo oficial da 2ª Corrida dos Guimarães" fetchPriority="high" />
        </div>
        <nav className="shortcuts" aria-label="Acessos da corrida">
          {shortcuts.map(item => <a key={item.href}
            className={'shortcut' + (item.primary ? ' shortcut-primary' : '')} href={item.href}>
            <span>{item.label}</span><span className="shortcut-arrow" aria-hidden="true" />
          </a>)}
        </nav>
        <div className="facts">
          <div><span>Distância</span><strong>5 km</strong></div>
          <div><span>Cidade</span><strong>Macapá · AP</strong></div>
          <div><span>Local</span><strong>Residencial Parque Irmãos Platon</strong></div>
        </div>
      </div>
    </section>

    <section id="sobre" className="wrap section about-grid">
      <div>
        <p className="eyebrow">Sobre a corrida</p>
        <h2>Um encontro.<br />Muitos laços.</h2>
      </div>
      <div className="stack about-copy">
        <p>A Corrida dos Guimarães chega à segunda edição celebrando a família, a união e as pessoas que nos inspiram a seguir em frente.</p>
        <p>Em 11 de abril de 2027, nossos laços ganham movimento em um percurso de 5 km no Residencial Parque Irmãos Platon, em Macapá.</p>
        <div className="dedication">
          <h3>Por quem você vai correr?</h3>
          <p>Na inscrição, você pode dedicar seus 5 km a alguém especial.</p>
        </div>
      </div>
    </section>

    <section id="percurso" className="section route-section">
      <div className="wrap route-grid">
        <div><p className="eyebrow">Percurso</p><h2>5 km para<br />criar memórias.</h2></div>
        <div className="route-info">
          <p className="route-distance">5 <span>km</span></p>
          <p className="route-type">Percurso contínuo</p>
          <p>Residencial Parque Irmãos Platon<br />Macapá · Amapá</p>
          <p className="muted">O mapa oficial e os pontos de largada e chegada serão divulgados aqui.</p>
        </div>
      </div>
    </section>

    <section id="inscricao" className="wrap section two">
      <div className="section-intro">
        <p className="eyebrow">Inscrições</p><h2>Venha fazer<br />parte dessa história.</h2>
        {closingDate && <p>Inscrições até <strong>{closingDate}</strong>, conforme disponibilidade de vagas.</p>}
        <a className="text-link" href="/acompanhar">Já se inscreveu? Acompanhe aqui</a>
      </div>
      <div className="panel registration-panel">
        {Object.hasOwn(errors, erro) && <p className="notice" role="alert">{errors[erro]}</p>}
        {open ? <form action={register} className="stack">
          <div className="registration-heading"><h3>Inscrição individual</h3><strong className="price">{money(race.price_cents)}</strong></div>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="key" value={registrationPath(id).split('=')[1]} />
          <input type="hidden" name="regulation" value={race.regulation} />
          <input type="hidden" name="responsibility" value={race.responsibility_terms} />
          <label>Endereço de e-mail<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label>Nome Completo<input name="name" autoComplete="name" minLength={3} maxLength={120} required /></label>
          <label>Data de nascimento<input name="birth_date" type="date" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required /><small className="muted">Usaremos sua data de nascimento junto com o e-mail para consultar a inscrição.</small></label>
          <label>CPF<CpfInput /></label>
          <label>Celular<PhoneInput /></label>
          <label>Sexo<select name="sex" defaultValue="" required>
            <option value="" disabled>Selecione</option>{Object.entries(sexes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Categoria<select name="category" defaultValue="" required aria-describedby="category-help">
            <option value="" disabled>Selecione</option>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <div id="category-help" className="field-help">
            <p><strong>Família:</strong> membros da família Guimarães, independentemente do sobrenome.</p>
            <p><strong>Amigos:</strong> amigos, convidados e moradores do Residencial.</p>
          </div>
          <label>Tamanho da camisa<select name="shirt" defaultValue="" required>
            <option value="" disabled>Selecione</option>{shirts.map(shirt => <option key={shirt}>{shirt}</option>)}
          </select></label>
          <label>Seu laço — por quem você vai correr esses 5 km?<input name="dedication" maxLength={100} required /></label>
          <section className="consent-text" aria-labelledby="responsibility-heading">
            <h3 id="responsibility-heading">Termo de responsabilidade e autorização de imagem</h3>
            <div className="regulation-text">{race.responsibility_terms}</div>
          </section>
          <label className="check"><input type="checkbox" name="accept" required />
            <span>Li e concordo com o termo de responsabilidade e autorização de imagem acima e com o <a href="#regulamento">regulamento da 2ª Corrida dos Guimarães</a>.</span>
          </label>
          <button className="button">Reservar minha vaga <span className="shortcut-arrow" aria-hidden="true" /></button>
        </form> : <><h3>Inscrições fechadas</h3><p>A abertura será divulgada pela organização da corrida.</p></>}
      </div>
    </section>

    <section id="regulamento" className="wrap section rule-section">
      <div className="section-heading"><p className="eyebrow">Antes de se inscrever</p><h2>Regulamento</h2></div>
      <div className="panel">
        {race?.regulation ? <div className="regulation-text">{race.regulation}</div>
          : <p>O regulamento será disponibilizado aqui pela organização.</p>}
      </div>
    </section>

    <section id="duvidas" className="wrap section faq-section">
      <div className="section-heading"><p className="eyebrow">Tudo pronto para correr?</p><h2>Dúvidas frequentes</h2></div>
      <div className="faq-list">
        <details><summary>Como acompanho minha inscrição?</summary>
          <p>Use <a href="/acompanhar">Acompanhar inscrição</a> e informe o e-mail e a data de nascimento usados no cadastro. Você também pode abrir o link que guardou após a inscrição.</p>
        </details>
        <details><summary>Quando minha inscrição é confirmada?</summary>
          <p>Após a aprovação do pagamento pelo Mercado Pago. A página da inscrição é atualizada automaticamente quando a confirmação é recebida.</p>
        </details>
        <details><summary>Como funciona a dedicatória dos 5 km?</summary>
          <p>No campo Seu laço, informe por quem você vai correr esses 5 km. Informe a pessoa ou as pessoas a quem deseja dedicar sua corrida.</p>
        </details>
        <details><summary>Onde e quando retiro meu kit?</summary>
          <p>As informações sobre data, horário e local da retirada serão divulgadas pela organização.</p>
        </details>
      </div>
    </section>
  </>;
}
