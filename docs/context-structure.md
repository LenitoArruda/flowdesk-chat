# Estrutura de contexto

O contexto é a única coisa que o modelo enxerga. Em vez de concatenar strings pelo código, o `ContextBuilder` (`src/context/ContextBuilder.ts`) monta o prompt a partir de **blocos tipados**, em **ordem fixa** e sob um **orçamento de tokens**.

## Blocos

| Ordem | Bloco | Origem | Obrigatório | Descartável |
|------:|-------|--------|:-----------:|:-----------:|
| 1 | `system` — persona e escopo | `context/prompts.ts` (`SYSTEM_PROMPT`) | sim | nunca |
| 2 | `rules` — regras invioláveis | `context/prompts.ts` (`RULES`) | sim | nunca |
| 3 | `userProfile` — fatos do usuário | `LongTermMemory.recall` | não | por último |
| 4 | `summary` — resumo da conversa antiga | `SummaryMemory` | não | por último |
| 5 | `knowledge` — trechos numerados da documentação | `Retriever` | sim | só os de menor score |
| 6 | `recentMessages` — conversa recente literal | `ShortTermMemory` | não | as mais antigas primeiro |
| 7 | `question` — pergunta atual | usuário | sim | nunca |

Os blocos 1 a 5 viram **uma única mensagem de sistema**, cada um sob um rótulo (`[REGRAS]`, `[PERFIL DO USUÁRIO]`, `[RESUMO DA CONVERSA]`, `[DOCUMENTAÇÃO]`). Depois seguem as mensagens recentes e, por fim, a pergunta como mensagem do usuário.

## Exemplo real (turno 6 da demo)

```text
Você é o Assistente de Suporte da FlowDesk, ...            ← system

[REGRAS]
1. Responda exclusivamente com as informações da seção [DOCUMENTAÇÃO]. ...
2. Cite a fonte de cada informação com o número do trecho ... [1] ou [2]
...

[PERFIL DO USUÁRIO]
- plano: Standard
- papel: administrador do projeto

[DOCUMENTAÇÃO]
[1] (fonte: workflows-e-status.md)
Workflows e status — Workflows personalizados
Workflows personalizados estão disponíveis nos planos Business e Enterprise. ...

[2] (fonte: planos-e-cobranca.md)
Planos e cobrança — Comparação dos planos
...

user: Então o que eu preciso fazer para ter workflows personalizados?
```

## Orçamento de tokens

`settings.context.maxTokens` (6.000) limita o prompt. Quando ele estoura, o `ContextBuilder` remove, nesta ordem:

1. mensagens recentes mais antigas, até restarem `minRecentMessages` (2);
2. trechos de documentação de menor score, até restar 1;
3. as mensagens recentes restantes;
4. o resumo;
5. o perfil do usuário.

`system`, `rules` e `question` nunca saem. O `report` devolvido lista os tokens por bloco e o que foi descartado; ele aparece no `trace` ("`718/6000 tokens`") e na saída `--debug` do chat.

A estimativa de tokens (`shared/text.ts`) usa ~3,5 caracteres por token, adequada ao português e sem dependência de tokenizador.

## Prompts

Ficam em `src/context/prompts.ts` (persona e regras do assistente) e junto do módulo que os usa (classificador de escopo, extração de fatos, resumo). Todos são em pt-BR, usam saída JSON quando o resultado é lido por código e rodam com temperatura 0 (ou 0,1 na resposta).

As **regras** do prompt são a terceira linha de defesa; as duas primeiras (regras de entrada e recuperação) não dependem de o modelo obedecer. Ver [rules.md](rules.md).

## Como estender

- **Novo bloco** (ex.: dados da conta vindos de uma API): adicione o campo em `ContextInput`, renderize-o em `ContextBuilder.render` e defina em que ponto da ordem de descarte ele entra.
- **Outra persona/produto**: troque `SYSTEM_PROMPT`, `RULES`, os documentos em `data/documents/` e os textos de `rules/refusals.ts`; a mecânica não muda.
