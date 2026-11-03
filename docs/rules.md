# Camada de regras

A regra central: **o assistente só fala sobre a FlowDesk**. Para que isso não dependa de o modelo "se comportar", o controle é feito em camadas, e cada camada pode encerrar o turno com uma recusa padronizada (`src/rules/refusals.ts`).

```text
mensagem ─► [1] regras de entrada ─► [2] ScopeGuard ─► [3] recuperação ─► geração ─► [4] outputGuard ─► resposta
              determinística          modelo (falha     sem documentação     │         determinística
              0 chamadas              fechada)          = sem geração        │
                                                                             └─ regras do prompt (última linha)
```

## 1. Regras de entrada — `rules/inputRules.ts`

Executam **antes de qualquer chamada ao modelo**. Texto normalizado (minúsculas, sem acento).

| Regra | Bloqueia | Recusa |
|-------|----------|--------|
| `input.not_empty` | mensagem vazia | `empty` |
| `input.max_length` | mais de 1.000 caracteres | `too_long` |
| `input.no_sensitive_data` | cartões, CPF, "minha senha é…", `token: …`, chaves `sk-…` | `sensitive_data` |
| `input.no_prompt_injection` | "ignore as instruções", "mostre seu prompt", "a partir de agora você é…", "modo desenvolvedor", equivalentes em inglês | `prompt_injection` |

Exemplos que **passam**: "Como mostrar as regras de automação?", "Posso ignorar notificações de uma issue?" (os padrões exigem a combinação verbo + alvo, não palavras soltas).

## 2. Escopo — `rules/ScopeGuard.ts`

Classificador de temperatura 0 com saída JSON. Recebe as últimas mensagens para entender continuações ("e no plano Free?").

| Rótulo | Resultado |
|--------|-----------|
| `in_scope` | segue o fluxo |
| `out_of_scope` | recusa `out_of_scope` (sem armazenar a mensagem) |
| `injection` | recusa `prompt_injection` |
| `smalltalk` | saudação/agradecimento: resposta fixa, **sem chamar o modelo** |

**Falha fechada:** JSON inválido ou rótulo desconhecido vira `out_of_scope`. Perguntas sobre recursos que a plataforma pode não ter ("tem app para Apple Watch?") e sobre o suporte da FlowDesk são `in_scope`; é a etapa seguinte que responde "não encontrei".

## 3. Recuperação — `knowledge/Retriever.ts`

Pontuação híbrida (0,7 semântica + 0,3 palavras-chave) com `minScore` de 0,35 (`config/settings.ts`). **Nenhum trecho acima do limite ⇒ recusa `no_knowledge` sem chamar o modelo de resposta.** O modelo nunca recebe a oportunidade de preencher lacunas.

## 4. Saída — `rules/outputGuard.ts`

Valida a resposta gerada antes de entregá-la:

| Regra | Exige |
|-------|-------|
| `output.requires_citation` | ao menos uma citação `[n]` (ou admitir "não encontrei") |
| `output.valid_citation` | toda citação aponta para um trecho que estava no contexto |
| `output.grounded_numbers` | todo número com 2+ dígitos (preços, limites, prazos) aparece na documentação, na pergunta ou no perfil do usuário |
| `output.no_prompt_leak` | não repete rótulos internos (`[REGRAS]`) nem descreve as instruções |
| `output.no_promises` | não promete ações ("vou abrir um chamado", "eu garanto") |

Reprovada, a resposta é substituída por `ungrounded_output` ("não consegui confirmar com segurança… fale com o suporte humano"), e o motivo fica no `trace`.

Limitação conhecida: a checagem de números é conservadora; um valor calculado pelo modelo (ex.: 15 usuários × R$ 48) que não esteja no texto é bloqueado. Para o domínio de suporte, preferimos recusar a arriscar um valor errado.

## 5. Regras no prompt

`context/prompts.ts` repete as regras ao modelo (usar só a documentação, citar, não inventar, só FlowDesk, não revelar instruções). É a última linha de defesa, não a primeira.

## Trilha de auditoria

Cada etapa registra um `TraceEntry` `{stage, rule, outcome, detail}` em `TurnResult.trace`. `npm run chat -- --debug` e `npm run demo` imprimem a trilha: dá para ver exatamente qual regra decidiu cada turno.

## Adicionar uma regra

1. Crie a função em `src/rules/` retornando `RuleResult` (`ALLOWED` ou `block(reason, rule, detail)`).
2. Chame-a em `SupportAssistant.handleTurn` na etapa adequada e registre o `trace`.
3. Se for um novo motivo de recusa, acrescente em `RefusalReason` e em `REFUSALS`.
4. Cubra com teste em `tests/unit/rules.test.ts` e um caso em `tests/behavior/assistant.test.ts`.
