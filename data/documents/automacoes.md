---
title: Automações
category: automacoes
---

As automações executam ações automaticamente quando algo acontece em um projeto, reduzindo trabalho repetitivo.

## Como funcionam

Cada regra de automação tem um gatilho, condições opcionais e uma ou mais ações. Exemplo: quando uma issue for movida para Em revisão (gatilho), se o tipo for Bug (condição), atribuir ao líder técnico e enviar uma mensagem no Slack (ações).

## Criar uma regra

Abra Configurações do projeto > Automações e clique em "Criar regra". Escolha um modelo ou comece do zero. Os gatilhos disponíveis são: issue criada, status alterado, campo alterado, comentário adicionado, prazo se aproximando e agendado (diário ou semanal). As ações incluem atribuir, alterar campo, comentar, transicionar issue, criar subtarefa e enviar notificação.

## Limites por plano

O plano Free não inclui automações. O plano Standard inclui 500 execuções por mês. O plano Business inclui 5.000 execuções por mês. O plano Enterprise tem execuções ilimitadas. Cada vez que uma regra dispara conta como uma execução.

## Histórico e depuração

Cada regra tem uma aba Histórico que lista as execuções com status Sucesso, Falha ou Ignorada. Uma execução é marcada como Ignorada quando as condições não foram atendidas. Em caso de Falha, o detalhe mostra a ação que não pôde ser concluída, por exemplo um usuário sem permissão.

## Pausar uma regra

Para parar temporariamente uma regra sem excluí-la, desative o interruptor ao lado do nome. Regras desativadas não consomem execuções.

## Quando o limite de execuções acaba

Ao atingir o limite mensal, as regras deixam de ser executadas até o início do próximo ciclo de cobrança. Os administradores da organização recebem um aviso quando o uso chega a 80% do limite.
