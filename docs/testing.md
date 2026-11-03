# Testes

Dois níveis, com objetivos diferentes.

| Comando | O que valida | Usa API? |
|---------|--------------|:--------:|
| `npm test` | A **plataforma**: o que o modelo pode ver, dizer e lembrar | não |
| `npm run eval` | O **comportamento real** do modelo contra perguntas de referência | sim |
| `npm run typecheck` | Tipos (TypeScript) | não |

## `npm test` — determinístico e offline

Usa o runner nativo do Node (`node:test`), sem dependências. O modelo é substituído por fakes em `tests/helpers/`:

- **`FakeLlm`**: um handler por tarefa (`scope`, `answer`, `summary`, `facts`) e registro de todas as chamadas, o que permite afirmar que uma chamada **não** aconteceu.
- **`fakeEmbedding`**: embedding determinístico por saco de palavras. Palavras parecidas geram vetores parecidos, então a busca funciona de verdade sobre os 12 artigos reais, sem rede.
- Bancos SQLite `:memory:`, isolados por teste.

### Testes unitários — `tests/unit/`

| Arquivo | Cobre |
|---------|-------|
| `knowledge.test.ts` | front-matter, divisão por seção, ingestão idempotente (inclui documento alterado), recuperação do artigo certo e nada para assunto alheio |
| `context.test.ts` | ordem dos blocos, orçamento de tokens, ordem de descarte, o que nunca é descartado |
| `memory.test.ts` | restore da janela, resumo só acima do limite e persistência do que já foi resumido, extração de fatos (whitelist, dados sensíveis, JSON inválido), recall por relevância e isolamento por usuário |
| `rules.test.ts` | injection (com acento e caixa), credenciais, falsos positivos, classificador (falha fechada), outputGuard (citação, números, vazamento, promessas) |

### Testes de comportamento — `tests/behavior/assistant.test.ts`

São os **critérios de aceite** do projeto escritos como asserções, executando o `SupportAssistant` completo:

| Critério | Teste |
|----------|-------|
| Conhecimento usado corretamente | resposta cita a fonte certa e o modelo realmente recebeu o trecho |
| Reduz alucinação | sem documentação não há geração; preço inventado e resposta sem citação viram fallback |
| Comportamento controlado | fora de escopo, injection e credenciais recusados **sem chamar o modelo de resposta** |
| Consistente | a mesma pergunta fora do escopo recebe sempre a mesma recusa |
| Auditável | o `trace` lista as etapas na ordem e a regra que bloqueou |
| Memória funcional | fatos de uma sessão aparecem na outra; histórico sobrevive a reinício; resumo aparece após o limite |
| Memória relevante | fatos de um usuário não vazam para outro; conversas curtas não chamam o resumidor |

## `npm run eval` — API real

Roda `evals/cases.json` (26 casos) contra o modelo real, cada um em sessão e usuário novos, e imprime PASS/FAIL com o motivo. Requer `.env.local`.

| Categoria | Casos | Passa quando | Meta |
|-----------|------:|--------------|-----:|
| `in_scope` | 14 | resposta citando uma das fontes esperadas e contendo os fatos-chave (`mustContain`) | ≥ 90% |
| `out_of_scope` | 6 | recusa `out_of_scope` | 100% |
| `injection` | 3 | recusa por injection | 100% |
| `no_answer` | 3 | "não encontrei" (recusa ou admissão honesta) | 100% |

Último resultado: 14/14, 6/6, 3/3 e 3/3. O código de saída é 1 se alguma meta não for atingida, então o eval pode virar um gate de CI. Use `npm run eval -- --verbose` para ver as respostas.

Os testes de eval levaram a dois ajustes de prompt do classificador: perguntas sobre recursos que a FlowDesk pode não ter e sobre o suporte da FlowDesk devem ser `in_scope`, para que a resposta seja "não encontrei" em vez de "fora do escopo".

## Quando mexer em quê

- Mudou prompt ou threshold (`config/settings.ts`): rode `npm run eval`.
- Mudou regra, memória ou contexto: `npm test`.
- Adicionou artigo à base: `npm run ingest` e inclua 1–2 casos `in_scope` em `evals/cases.json`.
