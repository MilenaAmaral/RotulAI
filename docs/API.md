# API do Rotulai

Base: `/api`. Documentação interativa em `/api/docs` (Swagger UI) e especificação OpenAPI 3.1 em `/api/docs.json`.

## Autenticação

1. `POST /auth/login` ou `/auth/register` retorna `{ user, accessToken }` e define o cookie `rotulai_rt` (httpOnly, `path=/api/auth`). `user.role` é `FREE`, `PREMIUM` ou `ADMIN`.
2. Envie `Authorization: Bearer <accessToken>` nas rotas privadas. O token expira em 15 minutos.
3. Para renovar, chame `POST /auth/refresh` com o cookie e o cabeçalho `X-Requested-With: Rotulai`.

## Formato de erro

### Perfis

O cadastro cria sempre o perfil `FREE`. Visitantes acessam somente o catálogo público; usuários autenticados podem
gerenciar os próprios favoritos. Somente `ADMIN` pode alterar o catálogo global, ingredientes curados, regras de
indicação e sinônimos. A autorização é aplicada no backend.

### Resposta de erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos. Verifique os campos informados.",
    "details": [{ "field": "name", "message": "O nome deve ter pelo menos 2 caracteres." }]
  }
}
```

| HTTP | Código                                 | Quando                                                                      |
| ---- | -------------------------------------- | --------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`                     | Entrada inválida, JSON malformado, id malformado                            |
| 401  | `UNAUTHORIZED`                         | Sem token, token expirado, credenciais incorretas                           |
| 403  | `FORBIDDEN`                            | Senha incorreta ou perfil sem permissão                                     |
| 404  | `NOT_FOUND`                            | Recurso inexistente **ou de outro usuário**                                 |
| 409  | `CONFLICT`                             | E-mail, nome ou frase já cadastrados (inclusive em requisições simultâneas) |
| 413  | `VALIDATION_ERROR`                     | Corpo acima de 64 KB                                                        |
| 429  | `RATE_LIMITED` / `AI_QUOTA_EXCEEDED`   | Limite de requisições ou cota diária de IA                                  |
| 502  | `AI_INVALID_RESPONSE`                  | Resposta da IA vazia ou fora do formato                                     |
| 503  | `AI_NOT_CONFIGURED` / `AI_UNAVAILABLE` | IA sem chave ou provedor indisponível                                       |
| 504  | `AI_TIMEOUT`                           | Tempo limite da IA excedido                                                 |
| 500  | `INTERNAL_ERROR`                       | Erro inesperado (detalhes apenas nos logs)                                  |

## Paginação

Listas aceitam `page` (padrão 1) e `pageSize` (padrão 12, máximo 50) e retornam:

```json
{ "items": [], "page": 1, "pageSize": 12, "total": 0, "totalPages": 1 }
```

## Catálogo público (sem autenticação)

O catálogo público é independente dos produtos pessoais. As páginas `/catalogo` e `/catalogo/ingredientes` consultam estes endpoints sem enviar token:

| Método | Rota                             | Parâmetros                          | Descrição                                                                        |
| ------ | -------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/catalog/products`              | `q`, `category`, `page`, `pageSize` | Busca aproximada em nome, marca, categoria e ingredientes; filtra por categoria. |
| GET    | `/catalog/products/:slug`        | —                                   | Detalhes, ingredientes na ordem da lista e link de referência.                   |
| GET    | `/catalog/ingredients`           | `q`, `function`, `page`, `pageSize` | Pesquisa ingredientes curados por nome/sinônimo e filtra por função.             |
| GET    | `/catalog/ingredients/functions` | —                                   | Funções disponíveis para o filtro.                                               |
| GET    | `/catalog/ingredients/:id`       | —                                   | Detalhe curado com funções, informações e fontes.                                |

O endpoint de detalhe público de ingrediente retorna 404 quando o registro não está curado. Nenhum destes endpoints retorna `userId` ou produtos do catálogo pessoal. A lista de produtos do catálogo público é alimentada separadamente por `npm run db:seed-public -w backend`; o comando faz upsert dos registros e vínculos, sem excluir dados.

A listagem de produtos retorna a página de resultados e `suggestions`, uma lista separada para a mensagem “Você quis dizer…” quando não há correspondência exata. A expansão usa a tabela `CatalogSearchSynonym`; consulte [docs/BUSCA-CATALOGO.md](./BUSCA-CATALOGO.md) para sinônimos, consultas de regressão e benchmark.

## Favoritos (usuário autenticado)

| Método | Rota                       | Descrição                                                    |
| ------ | -------------------------- | ------------------------------------------------------------ |
| GET    | `/favorites?page&pageSize` | Lista os favoritos da conta autenticada.                     |
| GET    | `/favorites/:productId`    | Informa `{ "isFavorite": boolean }` para um produto público. |
| PUT    | `/favorites/:productId`    | Salva o produto; operação idempotente.                       |
| DELETE | `/favorites/:productId`    | Remove o favorito; repetição também é segura.                |

Visitantes recebem `401`; favoritos são isolados por conta. Os registros pessoais legados não são publicados como
favoritos sem correspondência exata. A migração conserva os registros divergentes em privado e os disponibiliza para
exportação em `GET /products/archive/export`.

## Administração (perfil `ADMIN`)

Todas as rotas `/admin/*` exigem autenticação e perfil `ADMIN`; visitantes recebem `401` e outros perfis recebem
`403`. Os corpos são validados com Zod.

| Recurso              | Listar/consultar                  | Criar                              | Editar                                | Excluir                                  |
| -------------------- | --------------------------------- | ---------------------------------- | ------------------------------------- | ---------------------------------------- |
| Catálogo público     | `GET /admin/products`             | `POST /admin/products`             | `GET` e `PUT /admin/products/:id`     | `DELETE /admin/products/:id`             |
| Ingredientes curados | `GET /admin/ingredients`          | `POST /admin/ingredients`          | `PUT /admin/ingredients/:id`          | `DELETE /admin/ingredients/:id`          |
| Sinônimos de busca   | `GET /admin/search-synonyms`      | `POST /admin/search-synonyms`      | `PUT /admin/search-synonyms/:id`      | `DELETE /admin/search-synonyms/:id`      |
| Regras de indicação  | `GET /admin/recommendation-rules` | `POST /admin/recommendation-rules` | `PUT /admin/recommendation-rules/:id` | `DELETE /admin/recommendation-rules/:id` |

A exclusão de ingrediente em uso retorna `409`. Regras só aceitam ingredientes curados e a edição incrementa sua
versão. A justificativa editorial é armazenada com a regra para revisão. `referenceUrl` de produtos e `url` das fontes
de ingredientes precisam começar com `https://`; outros esquemas (`http:`, `javascript:`, `data:`) retornam `400`.

`POST`, `PUT` e `GET /admin/products/:id` respondem no mesmo formato de `GET /catalog/products/:slug`: os ingredientes
vêm como lista `{ id, name, functions, isCurated, position }` na ordem do rótulo.

## Exemplos

### Cadastrar produto no catálogo público (Admin)

```http
POST /api/admin/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sérum Hidratante",
  "brand": "Marca Fictícia",
  "category": "SERUM",
  "referenceUrl": "https://exemplo.org/produto",
  "ingredients": ["Aqua", "Glycerin", "Sodium Hyaluronate"]
}
```

Categorias: `LIMPEZA`, `TONICO`, `SERUM`, `HIDRATANTE`, `PROTETOR_SOLAR`, `ESFOLIANTE`, `MASCARA`, `OLHOS`, `LABIOS`, `TRATAMENTO`, `OUTRO`.

As rotas legadas `/products` operam sobre dados pessoais arquivados. Criação, edição e exclusão também exigem perfil
`ADMIN`; o fluxo normal da pessoa usuária é favoritar itens de `/catalog`.

### Consultar ingrediente

```http
POST /api/ingredient-analyses
{ "query": "vitamina b3" }
```

```json
{
  "id": "…",
  "query": "vitamina b3",
  "foundInCatalog": true,
  "ingredient": {
    "name": "Niacinamide",
    "functions": ["Condicionante da pele"],
    "description": "…",
    "sources": [{ "title": "CosIng…", "publisher": "Comissão Europeia", "url": "https://…" }],
    "isCurated": true
  },
  "aiExplanation": null
}
```

`POST /api/ingredient-analyses/:id/explanation` preenche `aiExplanation` (`{ text, model }`) sem alterar `ingredient`.

### Comparar produtos

Os dois ids são de produtos do **catálogo público** (a interface oferece os favoritos da pessoa). Ids inexistentes
no catálogo, como os de produtos pessoais legados, retornam `404` e nada é gravado no histórico.

```http
POST /api/comparisons
{ "productAId": "<uuid>", "productBId": "<uuid>" }
```

```json
{
  "id": "…",
  "result": {
    "productA": { "id": "…", "slug": "marca-produto", "name": "…", "ingredientCount": 3 },
    "productB": { "id": "…", "slug": "marca-outro", "name": "…", "ingredientCount": 2 },
    "sameBrand": false,
    "sameCategory": true,
    "commonIngredients": [{ "id": "…", "name": "Aqua", "positionA": 1, "positionB": 1 }],
    "exclusiveToA": [{ "id": "…", "name": "Glycerin", "position": 2 }],
    "exclusiveToB": [{ "id": "…", "name": "Panthenol", "position": 2 }],
    "overlapPercentage": 25
  },
  "aiExplanation": null
}
```

### Conversar com o assistente

```http
POST /api/conversations
{ "message": "O que é niacinamida?", "productIds": [] }
```

Retorna a conversa criada com as mensagens do usuário e do assistente. Mensagens seguintes: `POST /api/conversations/:id/messages` com o mesmo corpo. `productIds` (até 2) inclui nome, marca, categoria e ingredientes de produtos do catálogo público como contexto; ids fora do catálogo retornam `404`.

O resultado da comparação é um retrato salvo no momento da criação. Comparações antigas, feitas com produtos pessoais, não têm `slug` e podem trazer `description`.

### Status da IA

```http
GET /api/ai/status
```

```json
{
  "enabled": false,
  "provider": null,
  "model": null,
  "maxInputChars": 2000,
  "setupInstructions": "Para habilitar a IA, …"
}
```
