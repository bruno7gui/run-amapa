import './style.css';

export const metadata = {
  title: '2ª Corrida dos Guimarães | Run Amapá',
  description: 'Corrida de rua de 5 km em Macapá, no dia 11 de abril de 2027.',
};

export default function Layout({ children }) {
  return <html lang="pt-BR"><body>
    <header className="top"><div className="wrap top-inner">
      <a className="brand" href="/">RUN <strong>AMAPÁ</strong></a>
      <a href="/equipe">Área da equipe</a>
    </div></header>
    <main>{children}</main>
    <footer className="wrap footer">Run Amapá <span>Corrida dos Guimarães</span></footer>
  </body></html>;
}
