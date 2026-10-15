# SkinAI

Plataforma full stack para organizar cosméticos, entender ingredientes de rótulos e comparar produtos, com um assistente de inteligência artificial integrado pelo servidor.

![Dashboard do SkinAI](docs/screenshots/dashboard.png)

> **Aviso:** o SkinAI fornece informações educacionais. Não diagnostica doenças, não prescreve tratamentos, não garante ausência de alergias e não substitui a orientação de um dermatologista.

## Sumário

- [Problema](#problema)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como executar](#como-executar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes e qualidade](#testes-e-qualidade)
- [API](#api)
- [Build e deploy](#build-e-deploy)
- [Segurança](#segurança)
- [Limitações conhecidas](#limitações-conhecidas)
- [Próximas melhorias](#próximas-melhorias)

## Problema

Rótulos de cosméticos usam a nomenclatura INCI, em inglês ou latim, e listas longas de ingredientes. Quem quer entender o que está usando acaba alternando entre buscas na internet, conteúdos sem fonte e anotações soltas. O SkinAI centraliza esse fluxo:

- um catálogo pessoal com a lista de ingredientes de cada produto;
- uma base de referência de ingredientes com conteúdo revisado e fontes para verificação;
- comparação objetiva entre dois produtos, calculada por regras determinísticas;
- um assistente de IA para explicar termos, sempre identificado como conteúdo gerado por IA.

## Funcionalidades

| Área                  | O que faz                                                                                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Autenticação**      | Cadastro, login, sessão persistente com rotação de refresh token, logout e exclusão de conta com todos os dados.                                                                                                                                                                    |
| **Dashboard**         | Saudação, indicadores reais (produtos, ingredientes consultados, comparações, conversas), atividade recente, produtos por categoria e acessos rápidos.                                                                                                                              |
| **Catálogo**          | Listagem paginada, cadastro, edição, exclusão com confirmação, busca por nome ou marca, filtro por categoria e página de detalhes. Ingredientes são extraídos do texto do rótulo e vinculados ao catálogo global sem duplicação (inclusive por sinônimo: "Glicerina" = "Glycerin"). |
| **Ingredientes**      | Consulta por nome INCI ou nome comum, base de referência com 30 ingredientes revisados, sinônimos, funções, uso, cuidados e fontes. Conteúdo da base e explicação da IA aparecem em blocos separados. Quando não há informação confiável, a interface informa a limitação.          |
| **Comparador**        | Ingredientes em comum, exclusivos de cada produto, marca, categoria, descrições e percentual de sobreposição (índice de Jaccard). A IA pode explicar as diferenças, sem declarar qual produto é melhor.                                                                             |
| **Assistente SkinAI** | Chat com histórico, sugestões iniciais, contexto opcional de até 2 produtos do catálogo, limite de caracteres, indicador de digitação e mensagens claras de indisponibilidade.                                                                                                      |
| **Histórico**         | Consultas de ingredientes, comparações e conversas persistidas no PostgreSQL, com exclusão individual, limpeza por tipo e política de retenção visível ao usuário.                                                                                                                  |

### Telas

| Comparação                                     | Detalhe do produto                       | Celular                                 |
| ---------------------------------------------- | ---------------------------------------- | --------------------------------------- |
| ![Comparação](docs/screenshots/comparacao.png) | ![Produto](docs/screenshots/produto.png) | ![Celular](docs/screenshots/mobile.png) |

## Tecnologias

**Front-end:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, React Hook Form, Zod, Lucide React.

**Back-end:** Node.js, TypeScript, Express 5, Zod, Prisma ORM 7 (adapter `pg`), PostgreSQL 16, Swagger UI / OpenAPI 3.1, Helmet, express-rate-limit, bcrypt, JWT, Pino.

**IA:** SDK oficial da Anthropic atrás de uma interface própria (`LlmProvider`), selecionada por variável de ambiente.

**Testes e qualidade:** Vitest, Supertest, React Testing Library, ESLint, Prettier, GitHub Actions.

## Arquitetura

```
┌──────────────────────┐      HTTPS / JSON       ┌──────────────────────────────┐
│  Front-end (React)   │ ──────────────────────▶ │  API REST (Express)          │
│  - páginas e UI      │  Authorization: Bearer  │  - validação (Zod)           │
│  - TanStack Query    │  cookie httpOnly (RT)   │  - autenticação/autorização  │
│  - token em memória  │ ◀────────────────────── │  - regras de negócio         │
└──────────────────────┘                         │  - serviço de IA ─────────┐  │
                                                 └──────────┬────────────────┼──┘
                                                            │ Prisma         │ HTTPS
                                                            ▼                ▼
                                                   ┌────────────────┐  ┌──────────────┐
                                                   │  PostgreSQL    │  │ API de LLM   │
                                                   └────────────────┘  └──────────────┘
```

- O front-end só conversa com a API. A chave de IA existe apenas no servidor.
- Regras de negócio, validações e acesso a dados ficam no back-end, organizados por módulo (`routes` → `service` → Prisma).
- A comparação de produtos é uma função pura (`compare-products.ts`), testável sem banco.
- A IA passa por `AiService`, que aplica tempo limite, cota diária, validação da resposta e conversão de erros, independentemente do provedor.

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Estrutura de pastas

```
SkinAI/
├── backend/
│   ├── prisma/              # schema, migrações versionadas e seed
│   ├── src/
│   │   ├── config/          # leitura e validação das variáveis de ambiente
│   │   ├── docs/            # especificação OpenAPI
│   │   ├── lib/             # Prisma, logger, erros, paginação
│   │   ├── middleware/      # autenticação, validação, rate limit, erros
│   │   ├── modules/         # auth, products, ingredients, comparisons, conversations, ai, dashboard, history
│   │   ├── app.ts           # montagem do Express (injeção do serviço de IA)
│   │   └── server.ts        # inicialização e rotina de retenção
│   └── tests/               # unitários e integração (Supertest + PostgreSQL)
├── frontend/
│   ├── src/
│   │   ├── auth/            # contexto de sessão e guardas de rota
│   │   ├── components/      # layout e componentes reutilizáveis
│   │   ├── features/        # páginas por domínio
│   │   ├── lib/             # cliente HTTP, queries, formatação
│   │   └── types/           # contratos da API
│   └── tests/
├── docs/                    # arquitetura, API e capturas de tela
├── docker/                  # script de inicialização do PostgreSQL
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Como executar

### Requisitos

- Node.js 20.19 ou superior (recomendado 22 LTS) e npm 10+
- Docker Desktop (para o PostgreSQL) **ou** um PostgreSQL 14+ já instalado
- Opcional: chave da API Anthropic para habilitar a IA

### 1. Instalar dependências

```bash
git clone https://github.com/MilenaAmaral/SkinAI.git
cd SkinAI
npm run setup        # instala tudo e gera o Prisma Client
```

### 2. Subir o PostgreSQL

```bash
npm run db:up        # docker compose up -d db
```

O contêiner cria o usuário `skinai` (senha `skinai`), o banco `skinai` e o banco de testes `skinai_test`. Com um PostgreSQL próprio, crie os dois bancos e ajuste `DATABASE_URL` e `TEST_DATABASE_URL`.

### 3. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

No Windows (PowerShell): `Copy-Item backend/.env.example backend/.env`.

Edite `backend/.env` e defina um `JWT_ACCESS_SECRET` aleatório:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Migrações e dados de demonstração

```bash
npm run db:migrate   # aplica as migrações (prisma migrate dev)
npm run db:seed      # base de referência + usuária e produtos fictícios
```

Acesso de demonstração (fictício): **demo@skinai.dev** / **Demo@12345**.

### 5. Executar

Em dois terminais:

```bash
npm run dev:backend   # API em http://localhost:3333 (docs em /api/docs)
npm run dev:frontend  # interface em http://localhost:5173
```

Em desenvolvimento, o Vite encaminha `/api` para a API, então front e back compartilham a mesma origem.

### 6. Habilitar a IA (opcional)

Em `backend/.env`:

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sua-chave
AI_MODEL=claude-haiku-5-5
```

Reinicie a API. Sem a chave, o assistente e os botões de explicação mostram como habilitar a funcionalidade, e todo o restante continua funcionando. A aplicação nunca simula respostas de IA.

## Variáveis de ambiente

### Back-end (`backend/.env`)

| Variável                            | Padrão                  | Descrição                                       |
| ----------------------------------- | ----------------------- | ----------------------------------------------- |
| `DATABASE_URL`                      | obrigatória             | Conexão PostgreSQL.                             |
| `TEST_DATABASE_URL`                 | `.../skinai_test`       | Banco usado pelos testes.                       |
| `PORT`                              | `3333`                  | Porta da API.                                   |
| `CORS_ORIGINS`                      | `http://localhost:5173` | Origens permitidas, separadas por vírgula.      |
| `TRUST_PROXY`                       | `0`                     | Proxies confiáveis (use `1` em Render/Railway). |
| `JWT_ACCESS_SECRET`                 | obrigatória             | Segredo do access token (mín. 32 caracteres).   |
| `ACCESS_TOKEN_TTL_MINUTES`          | `15`                    | Validade do access token.                       |
| `REFRESH_TOKEN_TTL_DAYS`            | `7`                     | Validade do refresh token.                      |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` | `lax` / automático      | Política do cookie de sessão.                   |
| `BCRYPT_ROUNDS`                     | `12`                    | Custo do hash de senha.                         |
| `AI_PROVIDER`                       | `anthropic`             | `anthropic` ou `none`.                          |
| `ANTHROPIC_API_KEY`                 | vazio                   | Chave da IA (somente servidor).                 |
| `AI_MODEL`                          | `claude-haiku-5-5`      | Modelo utilizado.                               |
| `AI_TIMEOUT_MS`                     | `30000`                 | Tempo limite por chamada.                       |
| `AI_MAX_INPUT_CHARS`                | `2000`                  | Tamanho máximo da mensagem.                     |
| `AI_MAX_OUTPUT_TOKENS`              | `1024`                  | Tamanho máximo da resposta.                     |
| `AI_HISTORY_MESSAGES`               | `12`                    | Mensagens anteriores enviadas como contexto.    |
| `AI_RATE_LIMIT_PER_MINUTE`          | `10`                    | Requisições de IA por usuário por minuto.       |
| `AI_DAILY_LIMIT_PER_USER`           | `100`                   | Chamadas de IA por usuário em 24 h.             |
| `HISTORY_RETENTION_DAYS`            | `180`                   | Retenção do histórico.                          |

### Front-end (`frontend/.env`)

| Variável       | Descrição                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | URL pública da API. Deixe vazio em desenvolvimento ou quando a API estiver no mesmo domínio. |

## Testes e qualidade

```bash
npm test             # back-end (55 testes) e front-end (10 testes)
npm run lint
npm run typecheck
npm run format:check
```

Os testes do back-end usam o banco `skinai_test` (as migrações são aplicadas automaticamente). Cobrem:

- validação de cadastro de produtos e das requisições;
- regras determinísticas de comparação;
- autenticação: hash de senha, cookie httpOnly, rotação e detecção de reuso de refresh token, proteção CSRF, logout e exclusão de conta;
- isolamento de dados entre usuários (produtos, comparações, consultas, conversas e dashboard);
- falhas da integração com IA (não configurada, indisponível, tempo limite, resposta inválida, cota) usando um provedor de teste;
- retenção de dados, CORS, cabeçalhos de segurança e tratamento de erros.

O front-end testa o formulário de produto (validação e erros do servidor), a visualização da comparação, a renderização segura do texto da IA e o parser de ingredientes.

## API

Documentação interativa (Swagger UI): `http://localhost:3333/api/docs` · especificação: `/api/docs.json`.

| Método              | Rota                                                     | Descrição                                        |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| GET                 | `/api/health`                                            | Health check (API e banco)                       |
| POST                | `/api/auth/register` · `/login` · `/refresh` · `/logout` | Sessão                                           |
| GET / DELETE        | `/api/auth/me`                                           | Usuário atual / excluir conta                    |
| GET                 | `/api/dashboard`                                         | Indicadores e atividades                         |
| GET / POST          | `/api/products`                                          | Listar (busca, categoria, paginação) / cadastrar |
| GET / PUT / DELETE  | `/api/products/:id`                                      | Detalhar / editar / excluir                      |
| GET                 | `/api/ingredients` · `/api/ingredients/:id`              | Base de ingredientes                             |
| GET / POST / DELETE | `/api/ingredient-analyses`                               | Histórico / nova consulta / limpar               |
| POST                | `/api/ingredient-analyses/:id/explanation`               | Explicação por IA                                |
| GET / POST / DELETE | `/api/comparisons`                                       | Histórico / comparar / limpar                    |
| POST                | `/api/comparisons/:id/explanation`                       | Explicação por IA                                |
| GET / POST / DELETE | `/api/conversations`                                     | Conversas / iniciar / limpar                     |
| POST                | `/api/conversations/:id/messages`                        | Enviar mensagem                                  |
| GET                 | `/api/ai/status` · `/api/history/policy`                 | Status da IA / política de retenção              |

Detalhes, formatos e códigos de erro em [docs/API.md](docs/API.md).

## Build e deploy

```bash
npm run build        # gera backend/dist e frontend/dist
npm start -w backend # executa a API compilada
```

### Sugestão de hospedagem

**Banco:** PostgreSQL gerenciado (Neon, Supabase, Render ou Railway). Copie a URL de conexão.

**API (Render, Railway ou Fly.io):**

- Com Docker: `docker build -f backend/Dockerfile -t skinai-api .` (a imagem aplica `prisma migrate deploy` antes de iniciar).
- Sem Docker: build `npm ci && npm run db:generate -w backend && npm run build -w backend`; start `npm run db:deploy -w backend && npm start -w backend`.
- Variáveis: `NODE_ENV=production`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `CORS_ORIGINS=https://seu-front.vercel.app`, `TRUST_PROXY=1`, `ANTHROPIC_API_KEY` (opcional).
- Health check: `GET /api/health`.

**Front-end (Vercel ou Netlify):** diretório `frontend`, build `npm run build`, saída `dist`. O `vercel.json` já faz o fallback de rotas da SPA e adiciona cabeçalhos de segurança.

**Cookies entre domínios:** o refresh token fica em cookie httpOnly. Duas opções:

1. _Recomendado:_ fazer o front encaminhar `/api` para a API e deixar `VITE_API_URL` vazio. Tudo fica no mesmo domínio e `COOKIE_SAMESITE=lax` funciona. Na Vercel, adicione esta regra **antes** da regra da SPA em `frontend/vercel.json`, trocando pela URL real da API:
   ```json
   { "source": "/api/:path*", "destination": "https://sua-api.onrender.com/api/:path*" }
   ```
2. Domínios separados: `VITE_API_URL=https://sua-api`, `COOKIE_SAMESITE=none` e `COOKIE_SECURE=true`. Alguns navegadores bloqueiam cookies de terceiros; por isso a opção 1 é preferível.

A aplicação ainda **não está publicada**. As instruções acima foram preparadas, mas o deploy depende das suas contas nos serviços de hospedagem.

## Segurança

- Senhas com bcrypt (custo 12); política mínima de 8 caracteres com letras e números.
- Access token JWT de 15 minutos mantido **apenas em memória** no navegador (nunca em `localStorage`).
- Refresh token opaco de 256 bits em cookie `httpOnly`, com `path=/api/auth`, armazenado no banco somente como hash SHA-256, rotacionado a cada uso; reuso de um token antigo revoga toda a família de sessões.
- Rotas de refresh e logout exigem o cabeçalho `X-Requested-With: SkinAI`, bloqueando requisições forjadas de outros sites (CSRF).
- Autorização no servidor: toda consulta filtra por `userId`. Recursos de outro usuário retornam 404, sem revelar sua existência.
- Validação com Zod em todas as entradas; corpo limitado a 64 KB.
- Rate limiting global, de autenticação, de renovação de sessão e de IA (por usuário), além de cota diária de IA.
- Helmet, CORS restrito à lista configurada e `x-powered-by` desativado.
- Erros genéricos para o cliente; detalhes apenas nos logs, que removem senhas, tokens, cookies e chaves.
- Respostas da IA renderizadas como texto (sem HTML), com dados do usuário delimitados no prompt para reduzir injeção de instruções.
- Nenhum segredo versionado: `.env` está no `.gitignore` e só os arquivos `.env.example` são publicados.

**Riscos e decisões documentadas**

- O cadastro informa quando um e-mail já existe (melhor experiência, mas permite enumeração; mitigado por rate limit).
- Recuperação de senha não foi implementada porque exige um serviço real de envio de e-mail; a aplicação não simula envios.
- O rate limit usa memória do processo. Com várias instâncias, use um armazenamento compartilhado (Redis).

## Dados e retenção

- Consultas de ingredientes e comparações são excluídas automaticamente após `HISTORY_RETENTION_DAYS` (padrão 180 dias); conversas, após o mesmo período sem novas mensagens.
- Registros técnicos de uso da IA (sem conteúdo das mensagens) duram 30 dias, para controlar a cota.
- Produtos não expiram. A exclusão da conta remove todos os dados em cascata.
- O usuário pode excluir qualquer registro individualmente ou limpar cada tipo de histórico.

## Limitações conhecidas

- A base de referência contém 30 ingredientes. Textos são resumos educacionais escritos para o projeto; as fontes (CosIng da Comissão Europeia e Anvisa) servem para verificação e não são citação literal.
- Ingredientes digitados que não estão na base são criados apenas com o nome, sem descrição, e assim aparecem na interface.
- Se um ingrediente for cadastrado por sinônimo antes da carga da base de referência, os dois registros não são unificados automaticamente.
- A imagem do produto é uma URL externa; não há upload de arquivos.
- A integração com a IA foi testada com um provedor de teste. O funcionamento com a API real depende da chave configurada pelo usuário.
- As dependências da CLI do Prisma (usada para aplicar migrações em produção) têm alertas do `npm audit` em pacotes transitivos que não são usados pelo PostgreSQL em tempo de execução.
- O comparador e o assistente listam até os 50 produtos mais recentes.

## Próximas melhorias

- Recuperação de senha com serviço de e-mail transacional.
- Upload de imagens com armazenamento de objetos.
- Leitura do rótulo por foto (OCR) para preencher a lista de ingredientes.
- Ampliação da base de referência com processo de revisão e versionamento das fontes.
- Rate limit distribuído com Redis e observabilidade (métricas e tracing).
- Testes end-to-end automatizados com Playwright no CI.
- Respostas da IA em streaming.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).

Desenvolvido por **Milena Amaral Dias** ([GitHub](https://github.com/MilenaAmaral)).
