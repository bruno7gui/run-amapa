import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-800.css';
import './style.css';

export const metadata = {
  title: '2ª Corrida dos Guimarães | Run Amapá',
  description: 'Laços que nos movem. Corrida de rua de 5 km em Macapá, no dia 11 de abril de 2027.',
};

export default function Layout({ children }) {
  return <html lang="pt-BR"><body>
    <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
    <header className="top"><div className="wrap top-inner">
      <a className="brand" href="/" aria-label="Corrida dos Guimarães, início">
        <span className="emblem emblem-small" aria-hidden="true" />
        <span>CORRIDA DOS <strong>GUIMARÃES</strong></span>
      </a>
      <nav className="header-links" aria-label="Navegação">
        <a href="/acompanhar">Minha inscrição</a>
        <a className="team-link" href="/equipe">Área da equipe</a>
      </nav>
    </div></header>
    <main id="conteudo">{children}</main>
    <footer className="wrap footer">
      <a className="brand footer-brand" href="/">RUN <strong>AMAPÁ</strong></a>
      <span>Corrida dos Guimarães · Laços que nos movem</span><a href="/equipe">Área da equipe</a>
    </footer>
  </body></html>;
}
