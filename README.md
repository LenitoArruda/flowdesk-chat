# FlowDesk Support Assistant

Plataforma de contexto *AI-first* para o suporte da **FlowDesk**, um SaaS de gerenciamento de tarefas e projetos no estilo do Jira. Usuários tiram dúvidas sobre a plataforma em um chat; o assistente responde **apenas com base na documentação oficial**, **apenas sobre a FlowDesk**, lembra do que importa e mostra de onde veio cada resposta.

Projeto prático do Módulo 3 da pós-graduação: contexto estruturado, memória, regras e conhecimento.

## O que ele faz

- **Controla o comportamento:** recusa qualquer assunto que não seja a FlowDesk, bloqueia prompt injection e dados sensíveis, pede detalhes quando a mensagem é vaga, apenas registra mensagens que só informam dados do usuário e responde sempre da mesma forma a casos iguais.
- **Usa conhecimento real:** RAG sobre 12 artigos de suporte; cada resposta cita as fontes `[n]`. Sem documentação relevante, o modelo nem é chamado.
- **Reduz alucinação:** a resposta só é entregue se citar fontes existentes e se todo número (preço, limite, prazo) estiver na documentação; senão vira um fallback seguro.
- **Mantém memória:** conversa (curta), resumo automático de conversas longas e fatos duráveis do usuário entre sessões (plano, papel, ferramentas), isolados por usuário.
- **É auditável:** cada turno devolve um `trace` com a regra que decidiu cada etapa.

```text
Você: Quem vai ganhar o campeonato de futebol este ano?
Assistente: Só consigo ajudar com dúvidas sobre a FlowDesk (projetos, issues, boards, ...)

Você: Posso criar workflows personalizados no plano Standard?
Assistente: No plano Standard, você não pode ter workflows personalizados. [...]
            Workflows personalizados estão disponíveis apenas nos planos Business e Enterprise [1].
Fontes:     [1] Workflows e status › Workflows personalizados (workflows-e-status.md)
```

## Arquitetura em uma olhada

```text
mensagem → regras de entrada → escopo → memória → recuperação → contexto → modelo → validação de saída → resposta
              (sem modelo)     (modelo)  (3 níveis)  (sem docs = sem geração)  (blocos + orçamento)       (citações, números)
```

| Pasta | Responsabilidade |
|-------|------------------|
| `src/rules` | regras de entrada, `ScopeGuard`, `outputGuard`, textos de recusa |
| `src/context` | prompts e `ContextBuilder` (blocos tipados, ordem fixa, orçamento de tokens) |
| `src/memory` | memória curta, resumo e longa |
| `src/knowledge` | carga de `.md`, divisão por seção, ingestão idempotente, busca híbrida |
| `src/assistant` | `SupportAssistant` (orquestra um turno) e `createAssistant` (composição) |
| `src/llm` | interface `LlmClient` e adaptador OpenAI |
| `src/repositories` | SQLite: mensagens, vetores, resumos e fatos |
| `src/cli` | `chat`, `demo`, `eval`, `ingest` |
| `tests/`, `evals/` | testes de comportamento e avaliação com a API real |
| `data/documents` | base de conhecimento (Markdown) |

Detalhes e diagrama em [docs/architecture.md](docs/architecture.md).

## Como executar

Requisitos: Node.js 22.13 ou superior e uma chave da OpenAI. Não há etapa de build nem servidor de banco: o projeto usa o type stripping e o SQLite nativos do Node.

```bash
npm install
npm run env:setup        # copia .env.example para .env.local
```

No Windows PowerShell, use `Copy-Item .env.example .env.local`. Edite `.env.local` e informe `OPENAI_API_KEY`.

| Comando | O que faz |
|---------|-----------|
| `npm run chat` | chat interativo (`--user <id>`, `--session <id>` para retomar, `--debug` para ver o trace) |
| `npm run demo` | roteiro automático: dúvida real, fora de escopo, injection, sem resposta e memória entre sessões |
| `npm run ingest` | indexa `data/documents/*.md` (idempotente; o chat também faz isso ao iniciar) |
| `npm test` | testes unitários e de comportamento, offline, sem chave |
| `npm run eval` | 26 perguntas de referência contra o modelo real, com metas por categoria |
| `npm run eval:report` | 24 perguntas (28 turnos: base, fora da base, ambíguas, follow-ups, inesperadas) e grava as evidências em `evals/results/` |
| `npm run typecheck` | checagem de tipos |

Exemplo:

```bash
npm run chat -- --user ana --debug
```

## Estrutura de contexto

O prompt é montado por blocos, sempre na mesma ordem, dentro de um orçamento de tokens:

`system` → `regras` → `perfil do usuário` → `resumo` → `documentação` → `mensagens recentes` → `pergunta`

Quando excede o orçamento, descarta primeiro as mensagens antigas e os trechos de menor score; `system`, `regras` e `pergunta` nunca saem. Ver [docs/context-structure.md](docs/context-structure.md).

## Resultados da avaliação

Com a API real, em 24 perguntas e duas rodadas (`npm run eval:report`; dados em `evals/results/`): **16 corretas na rodada 1 e 20 na rodada 2**, após três correções (glossário no classificador, rótulos `ambiguous` e `statement`). Nenhuma resposta inventou fatos; as falhas restantes são recusas indevidas (pergunta em inglês e com erros de digitação). A suíte `npm run eval` passa 26 de 26 e `npm test`, 57 de 57. As notas de fidelidade foram atribuídas por um único avaliador.

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [docs/architecture.md](docs/architecture.md) | arquitetura, fluxo de um turno, camadas, decisões |
| [docs/context-structure.md](docs/context-structure.md) | blocos de contexto, orçamento, exemplo real |
| [docs/rules.md](docs/rules.md) | camadas de regras e como adicionar uma |
| [docs/use-cases.md](docs/use-cases.md) | seis casos de uso reais com a cobertura de cada um |
| [docs/testing.md](docs/testing.md) | estratégia de testes, critérios de aceite, eval e rodadas de avaliação |

## Critérios de aceitação

| Critério | Como é atendido | Verificação |
|----------|-----------------|-------------|
| Arquitetura clara e modular | camadas com responsabilidade única, dependências injetadas | [architecture.md](docs/architecture.md) |
| Comportamento consistente e controlado | regras determinísticas + classificador com falha fechada + validação de saída | `tests/behavior`, eval `out_of_scope` e `injection` |
| Memória funcional e relevante | curta, resumo e longa; fatos filtrados por relevância e isolados por usuário | `tests/unit/memory.test.ts`, demo passos 5–6 |
| Conhecimento correto, menos alucinação | RAG com citações; sem documentação não há geração; números verificados | eval `in_scope` e `no_answer` |
| Engenharia reutilizável e documentada | `LlmClient` abstrato, fakes de teste, TypeScript estrito, docs | `npm test`, `npm run typecheck` |

## Adaptar para outro produto

Troque os artigos em `data/documents/`, o `SYSTEM_PROMPT` e as `RULES` em `src/context/prompts.ts` e os textos de `src/rules/refusals.ts`. A mecânica de regras, memória, contexto e recuperação permanece.

## Limitações

- A busca compara a pergunta com todos os vetores; para milhares de chunks, troque por um índice vetorial mantendo a interface de `VectorRepository`.
- A verificação de números é conservadora e pode bloquear um valor calculado pelo modelo.
- A extração de fatos do usuário depende do modelo e só roda quando a mensagem fala do próprio usuário ou da equipe.
- O contato do suporte humano (`suporte@flowdesk.example`) e a base de conhecimento são fictícios.

## Exercícios anteriores

`examples/build-finetuning-dataset.ts` (`npm run fine-tuning:dataset`) gera um dataset de avaliações classificadas por sentimento em Parquet. É material do módulo anterior e não faz parte do assistente.
