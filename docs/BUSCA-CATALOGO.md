# Busca do catálogo público

## Funcionamento

A busca pública consulta apenas `CatalogProduct` e suas relações públicas de ingredientes; não mistura produtos pessoais. O termo é normalizado sem acentos e pontuação, reduz plurais simples ao singular e ignora palavras de ligação na expansão de sinônimos. Termos são comparados como palavras/frases completas, inclusive na busca de ingredientes. A tolerância de um caractere aplica-se a termos do dicionário com pelo menos cinco letras e não a pedaços de palavras. A ordenação combina nome/marca exatos, categoria resolvida, ingrediente correspondente, similaridade trigram entre palavras inteiras e uma ordenação estável por marca/nome.

A migration `backend/prisma/migrations/20261019130000_catalog_search/` habilita `pg_trgm` e `unaccent`, cria a função imutável usada pelas expressões e adiciona índices GIN trigram em nome, marca e nome do ingrediente. A tabela `Ingredient.searchTerms` continua apoiada pelo seu índice GIN array para sinônimos de ingredientes.

As extensões e índices de expressão são criados por SQL versionado porque dependem de recursos específicos do PostgreSQL. A migration falha explicitamente se o provedor não permitir instalar as extensões; não há fallback silencioso para uma busca mais fraca.

## Sinônimos

Os sinônimos iniciais ficam em `backend/prisma/search-synonyms.ts` e são inseridos pelo comando seguro `npm run db:seed-public -w backend`. O seed só cria sinônimos ausentes (`upsert` sem atualizar registros já existentes), então ajustes operacionais feitos na tabela permanecem. Para editar, altere `phrase`, `expansions` e, quando aplicável, `category` em `CatalogSearchSynonym`; `normalizedPhrase` deve ser minúscula, sem acentos, pontuação, stopwords ou plural simples. Formas singulares/plurais equivalentes são consolidadas durante a busca.

Não existe endpoint público para alterar as regras. A API de leitura usa a tabela como fonte de verdade e expande frases completas, evitando substituições acidentais dentro de outras palavras. A resposta inclui `suggestionType`: `related` para expansão do dicionário, `correction` para correção aproximada e `null` quando não há sugestão. O termo `coceira` foi removido do dicionário.

## Consultas de regressão

O conjunto de dados desses casos usa somente os produtos presentes no catálogo de demonstração versionado no repositório. O teste verifica recuperação e sugestões; não avalia adequação de produto a pele ou condição clínica.

| Entrada                    | Esperado                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `serave hidratante`        | CeraVe Moisturizing Cream entre os primeiros                                        |
| `hidratante cerave`        | Mesmo produto com termos em ordem invertida                                         |
| `la roche`                 | Produtos da marca La Roche-Posay                                                    |
| `protetor solar oleosa`    | Produto(s) da categoria PROTETOR_SOLAR; não significa recomendação para pele oleosa |
| `sabonete acne`            | CeraVe Acne Control Cleanser entre os primeiros                                     |
| `acido hialuronico`        | CeraVe Hydrating Facial Cleanser via ingrediente/sinônimo sem acento                |
| `ceraeve moiturizing crem` | Sugestão “Você quis dizer…” para CeraVe Moisturizing Cream                          |
| `proteor solar`            | Sugestões próximas da categoria PROTETOR_SOLAR                                      |

## Medição

O script `backend/scripts/benchmark-catalog-search.ts` executa 10 aquecimentos e 100 medições por consulta, usando `TEST_DATABASE_URL` e imprimindo p50/p95 em milissegundos. Execute apenas contra uma base Neon staging/teste já migrada e populada; não use a URL de produção. O tempo medido é o serviço de busca e suas consultas ao banco, incluindo a ida e volta do runner ao banco, mas não inclui navegador, CDN ou rede cliente→API.

```powershell
$env:TEST_DATABASE_URL = '<URL da base Neon staging, mantida fora do histórico/saída>'
npm run benchmark:catalog-search -w backend
```

Registre os valores observados nesta tabela junto com data, região, número de produtos e localização do runner. Não registre a URL nem credenciais:

| Data                                            | Ambiente/região |                   Produtos | Consulta                  | p50 (ms) | p95 (ms) |
| ----------------------------------------------- | --------------- | -------------------------: | ------------------------- | -------: | -------: |
| Pendente de execução autorizada em Neon staging | Neon São Paulo  | 101 (seed de demonstração) | Consultas da tabela acima |        — |        — |

Use `EXPLAIN (ANALYZE, BUFFERS)` em staging para confirmar a seleção dos índices trigram. As medições não são um limiar rígido de CI: latência de rede e estado do plano/cache variam; testes automatizados verificam resultados e ordenação.
