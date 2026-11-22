import { lookupRegistration, openRegistration } from '../actions';

export const dynamic = 'force-dynamic';
const errors = {
  dados: 'Confira o e-mail e a data de nascimento informados.',
  consulta: 'Não encontramos uma inscrição com esses dados. Confira o e-mail e a data de nascimento do cadastro.',
  limite: 'Muitas tentativas de consulta. Aguarde quinze minutos e tente novamente.',
  indisponivel: 'Não foi possível consultar agora. Tente novamente em instantes.',
  link: 'Confira o link completo recebido após a inscrição ou no e-mail de confirmação.',
};

export default async function FollowRegistration({ searchParams }) {
  const { erro } = await searchParams;
  return <section className="wrap section narrow">
    <div className="lookup-heading">
      <p className="eyebrow">2ª Corrida dos Guimarães</p>
      <h1 style={{ fontSize: 'clamp(1.8rem,6vw,2.6rem)', textTransform: 'none' }}>Acompanhar inscrição</h1>
    </div>
    <div className="panel stack">
      {Object.hasOwn(errors, erro) && <p className="notice" role="alert">{errors[erro]}</p>}
      <form action={lookupRegistration} className="stack">
        <p>Consulte sua inscrição com os mesmos dados informados no cadastro.</p>
        <label>E-mail da inscrição<input type="email" name="email" maxLength={254} autoComplete="email" required /></label>
        <label>Data de nascimento<input type="date" name="birth_date" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required /></label>
        <button className="button">Consultar inscrição</button>
      </form>
      <details className="lookup-divider">
        <summary>Já tenho meu link de inscrição</summary>
        <form className="stack" action={openRegistration}>
          <p>Se você se inscreveu antes da inclusão da data de nascimento, abra seu link e complete esse dado na página da inscrição.</p>
          <label>Cole o link completo da inscrição<input name="link" type="text" inputMode="url" placeholder="https://runamapa.netlify.app/inscricao/…" required /></label>
          <button className="button">Abrir minha inscrição</button>
        </form>
      </details>
      <a href="/#inscricao">Fazer uma nova inscrição</a>
    </div>
  </section>;
}
