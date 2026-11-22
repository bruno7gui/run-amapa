import { emailConfigured } from '../../lib/server';
import { openRegistration, recoverRegistration } from '../actions';

const errors = {
  email: 'Informe um e-mail válido.',
  envio: 'Não foi possível enviar o link agora. Tente novamente mais tarde ou abra o link que você já guardou.',
  link: 'Confira o link completo recebido após a inscrição ou no e-mail de confirmação.',
};

export default async function FollowRegistration({ searchParams }) {
  const { erro, enviado } = await searchParams;
  return <section className="wrap section narrow">
    <div className="lookup-heading">
      <p className="eyebrow">2ª Corrida dos Guimarães</p>
      <h1 style={{ fontSize: 'clamp(1.8rem,6vw,2.6rem)', textTransform: 'none' }}>Acompanhar inscrição</h1>
    </div>
    <div className="panel stack">
      {Object.hasOwn(errors, erro) && <p className="notice" role="alert">{errors[erro]}</p>}
      {enviado && <p className="notice" role="status">Se houver uma inscrição com esse e-mail, você receberá o link de acompanhamento. Confira também o spam. Aguarde dez minutos antes de solicitar outro envio.</p>}
      {emailConfigured() ? <form action={recoverRegistration} className="stack">
        <p>Receba o link no e-mail informado na sua inscrição.</p>
        <label>E-mail da inscrição<input type="email" name="email" maxLength={254} autoComplete="email" required /></label>
        <button className="button">Receber meu link</button>
      </form> : <p>O envio do link por e-mail está sendo ativado. Você já pode acompanhar usando o link que guardou ao se inscrever.</p>}
      <form className="stack lookup-divider" action={openRegistration}>
        <h2 style={{ fontSize: '1.15rem', letterSpacing: 0 }}>Já tenho meu link</h2>
        <label>Cole o link completo da inscrição<input name="link" type="text" inputMode="url" placeholder="https://runamapa.netlify.app/inscricao/…" required /></label>
        <button className="button">Abrir minha inscrição</button>
      </form>
      <a href="/#inscricao">Fazer uma nova inscrição</a>
    </div>
  </section>;
}
