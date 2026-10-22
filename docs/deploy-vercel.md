# Preparar o RotulAI para Vercel

Este guia prepara o front-end e a API no mesmo domínio. Nenhum banco, projeto Vercel ou serviço é criado automaticamente; escolha e configure esses recursos manualmente.

## O que está configurado no repositório

O [`vercel.json`](../vercel.json) define dois Vercel Services: `frontend` (Vite) serve as páginas e `backend` (Express) atende `/api`. Os rewrites mantêm a API e o front-end na mesma origem, permitindo `COOKIE_SAMESITE=lax` e `VITE_API_URL` vazio. A configuração usa Vercel Services, atualmente documentado pela Vercel como beta; confirme disponibilidade e comportamento no plano e na conta antes de depender dela em produção.

O backend exporta a aplicação Express para execução como função e não inicia `app.listen()` nem um timer persistente na Vercel. Em execução local ou em um servidor persistente, o servidor continua ouvindo a porta configurada e mantém a rotina de retenção existente.

## 1. Criar e preparar o PostgreSQL

Configure manualmente um banco PostgreSQL de produção com o provedor de sua escolha. Separe-o dos bancos de desenvolvimento e teste. Para a aplicação, prefira uma URL com pooler quando o provedor oferecer esse recurso; o pool local da API está limitado a cinco conexões por instância. Confira os limites totais de conexões do plano e do provedor.

Antes do primeiro deploy, aplique as migrações e carregue os dados iniciais **manualmente**, fora do build. Use a URL direta do banco para migrações. No PowerShell, a partir da raiz do repositório:

```powershell
$env:DATABASE_URL = "<URL-direta-do-banco-de-producao>"
npm run db:deploy -w backend
npm run db:seed -w backend
npm run db:seed-public -w backend
Remove-Item Env:DATABASE_URL
```

`db:seed` cria os ingredientes de referência ausentes e não sobrescreve os já existentes. `db:seed-public` cadastra produtos públicos que ainda não existem e sinônimos ausentes; não atualiza nem apaga produtos já cadastrados. Revise os dados e a política editorial antes de carregar conteúdo em produção. Não execute `db:reset` em produção.

Se precisar criar o primeiro administrador, use `admin:bootstrap` uma única vez, com credenciais fortes fornecidas somente no ambiente do comando; remova-as depois. O script não troca a senha de uma conta existente.

## 2. Configurar as variáveis na Vercel

No painel do projeto, cadastre as variáveis abaixo nos ambientes de produção e preview conforme necessário. Segredos devem ser gerados localmente ou no gerenciador seguro de sua preferência, nunca versionados.

| Variável            | Configuração                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | URL de aplicação, preferencialmente pooled; não use a URL direta de migração se o provedor recomendar uma URL diferente para conexões da aplicação. |
| `JWT_ACCESS_SECRET` | Segredo aleatório com pelo menos 32 caracteres.                                                                                                     |
| `CRON_SECRET`       | Segredo aleatório com pelo menos 32 caracteres. A Vercel o usa para enviar `Authorization: Bearer <CRON_SECRET>` ao Cron.                           |
| `NODE_ENV`          | `production`.                                                                                                                                       |
| `CORS_ORIGINS`      | Origem exata do site, por exemplo `https://rotulai.vercel.app`, sem barra final.                                                                    |
| `TRUST_PROXY`       | `1` para a infraestrutura da Vercel.                                                                                                                |
| `COOKIE_SECURE`     | `true`.                                                                                                                                             |
| `COOKIE_SAMESITE`   | `lax` com front-end e API no mesmo domínio.                                                                                                         |
| `AI_PROVIDER`       | `none` para desabilitar IA, ou `anthropic` com `ANTHROPIC_API_KEY` configurada no servidor.                                                         |

Uma forma de gerar segredos localmente com Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Gere valores independentes para `JWT_ACCESS_SECRET` e `CRON_SECRET`. Não configure `VITE_API_URL` quando as rotas estiverem no mesmo domínio.

## 3. Importar e implantar

Importe o repositório na Vercel e mantenha o diretório raiz do projeto como a raiz do repositório (`./`), para que a configuração com Services seja lida. Faça primeiro um deploy de preview e confirme que os dois serviços constroem e iniciam antes de promover para produção.

Os comandos definidos atualmente são:

| Serviço    | Diretório  | Build                 | Entrada                                    |
| ---------- | ---------- | --------------------- | ------------------------------------------ |
| `frontend` | `frontend` | `npm run build`       | saída estática `dist`, com fallback de SPA |
| `backend`  | `backend`  | `npm run db:generate` | `src/server.ts`                            |

O build gera o Prisma Client, mas não aplica migrações e não executa seeds. Migrações e dados iniciais permanecem operações manuais e separadas.

## 4. Retenção agendada

O `vercel.json` agenda `GET /api/cron/retention` diariamente às 05:17 UTC. O endpoint chama a mesma rotina existente de retenção e só executa quando recebe o `CRON_SECRET` correto. Se o segredo não estiver configurado, retorna `503`; um segredo inválido retorna `401`. A rotina preserva os limites definidos por `HISTORY_RETENTION_DAYS` e a política existente para uso da IA e refresh tokens.

Configure `CRON_SECRET` antes de depender da agenda e confirme no painel da Vercel a execução do Cron após o deploy de produção. Vercel Cron chama a URL pública de produção e opera em UTC. Não substitua o segredo por uma rota pública sem autenticação.

## 5. Verificações após o deploy

Faça as verificações manualmente no domínio implantado:

1. `GET /api/health` responde `200` e informa banco `ok`.
2. `GET /api/catalog/products` responde e apresenta dados depois que o seed público tiver sido aplicado.
3. Cadastro, login, renovação de sessão e logout funcionam no mesmo domínio; confira o cookie `rotulai_rt` com `HttpOnly`, `Secure` e `SameSite=Lax`.
4. Páginas públicas, catálogo, telas autenticadas e alternância de tema carregam sem erros no navegador.
5. Uma chamada sem segredo a `/api/cron/retention` retorna `401` (ou `503` se `CRON_SECRET` estiver ausente) e não executa a limpeza.
6. O Cron aparece e executa no painel do ambiente de produção.

Em execução serverless, o limitador de requisições usa memória por instância e não fornece uma cota global entre instâncias. A interface interativa do Swagger em `/api/docs` pode não funcionar na Vercel; a especificação permanece disponível em `/api/docs.json`.

## Limites desta preparação

Os testes e builds locais não comprovam conectividade com o banco hospedado, comportamento dos cookies no domínio final, execução real do Vercel Cron ou compatibilidade da conta com Vercel Services. Não considere produção validada até fazer as verificações acima com o banco, os segredos, o domínio e o projeto Vercel reais. Não há deploy, migração ou criação de infraestrutura realizados por este guia.
