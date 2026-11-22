import { settings } from '../../lib/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Termo de responsabilidade e autorização de imagem | Corrida dos Guimarães' };

export default async function TermsPage() {
  const race = await settings();
  return <section className="wrap section narrow stack">
    <p className="eyebrow">2ª Corrida dos Guimarães</p>
    <h1 style={{ fontSize: 'clamp(1.7rem,5vw,2.5rem)', textTransform: 'none', lineHeight: 1.2 }}>
      Termo de responsabilidade e autorização de imagem
    </h1>
    <p className="muted">Após a leitura, feche esta aba para voltar ao formulário e marcar sua concordância.</p>
    <div className="panel regulation-text">{race.responsibility_terms}</div>
    <a href="/#inscricao">Ir para a inscrição</a>
  </section>;
}
