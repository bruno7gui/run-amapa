# Run Amapá · 2ª Corrida dos Guimarães

Piloto de um único evento em Next.js, Supabase e Checkout Pro com Orders. A conta recebedora é a da organização desta corrida. O formulário aceita inscrição individual sem login e disponibiliza um link de acompanhamento. A área da equipe permite definir vagas, preço e regulamento, acompanhar pagamentos, exportar CSV e marcar a entrega de kits.

## Implantação de teste

1. Envie este código ao repositório e importe-o no Netlify. Use Node 22 ou 24 e a configuração de build do projeto.
2. Abra o SQL Editor do projeto Supabase de teste e execute o arquivo em `supabase/migrations/` uma vez. As inscrições começam fechadas. Em **Authentication → Users**, crie o usuário de teste da equipe, com e-mail confirmado e senha forte. Desabilite cadastros públicos no Auth deste projeto dedicado. A lista de acesso da equipe é definida em `PILOT_ADMIN_EMAILS`.
3. Defina no Netlify as variáveis de `.env.example`. Use a chave publicável e a chave secreta do projeto Supabase. Defina `SITE_URL` como a origem HTTPS do deploy e gere `REGISTRATION_LINK_SECRET` com `openssl rand -hex 32`. Salve as credenciais privadas somente no ambiente do servidor. Conserve o segredo do link para que links emitidos continuem válidos.
4. Na aplicação Checkout Pro **Orders** da organização, use o **Access Token de teste**. Em **Configuração de webhooks → Teste**, configure o destino `https://SEU-SITE.netlify.app/api/mercado-pago` e selecione o tópico **Orders** (`orders_v2`). Configure o segredo exibido no painel em `MERCADO_PAGO_WEBHOOK_SECRET`. Reimplante com as variáveis atualizadas. O retorno do checkout é definido pelo próprio site e dispensa Redirect URL de OAuth.
5. Para enviar e-mails de confirmação, configure um remetente verificado no Resend e preencha `RESEND_API_KEY` e `CONFIRMATION_FROM`. Sem essas variáveis, o atleta acompanha pelo link exibido na tela. Configure o e-mail antes de abrir inscrições externas.
6. Abra `/equipe`, faça login e configure um regulamento, preço e vagas fictícios. Abra as inscrições apenas no ambiente de teste. No celular, inscreva-se e use os cartões de teste da documentação do Checkout Pro Orders. Verifique confirmação, atualização do painel, e-mail e exportação. Verifique recusa, cancelamento e estorno antes da abertura real.

## Produção

Crie um ambiente separado para dados reais, aplique a migração e use as credenciais e webhook de produção. Feche horário, preço, vagas, opções de camisa e regulamento (incluindo privacidade e cancelamento). Revise o risco de reservas automatizadas e valide Pix e cartão antes de divulgar. Reservas sem checkout expiram em 15 minutos. Quando o checkout já começou, a vaga aguarda um estado definitivo do provedor. Em caso de falha de notificação, use **Sincronizar** na respectiva inscrição. Se uma tentativa de criação ficar sem Order ID, confira a cobrança no provedor antes de liberar a reserva.

## Desenvolvimento

```sh
npm ci
cp .env.example .env.local
npm run dev
npm test
npm run build
```

Os testes usam PostgreSQL local em memória. A migração online e os serviços externos devem ser verificados no ambiente de teste.
