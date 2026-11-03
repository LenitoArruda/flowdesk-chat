---
title: Workflows e status
category: workflows
---

O workflow define os status pelos quais uma issue passa e quais transições são permitidas entre eles.

## Workflow padrão

Todo projeto começa com o workflow padrão: A fazer, Em andamento, Em revisão e Concluído. Uma issue pode ser movida entre quaisquer dois status desse workflow, arrastando o cartão no board ou alterando o campo Status na própria issue.

## Workflows personalizados

Workflows personalizados estão disponíveis nos planos Business e Enterprise. Administradores do projeto acessam Configurações do projeto > Workflows, clonam o workflow padrão e então adicionam status, renomeiam colunas e definem as transições permitidas. Os planos Free e Standard usam sempre o workflow padrão, que não pode ser editado.

## Transições e condições

Em um workflow personalizado, cada transição pode ter uma condição, como "somente o responsável pode concluir" ou "exige um revisor". Se uma transição não aparecer ao mover uma issue, o motivo mais comum é uma condição que o usuário não atende ou uma transição que não foi criada no workflow.

## Resolução

Ao mover uma issue para um status da categoria Concluído, o campo Resolução é preenchido. As opções são Concluída, Não será feita, Duplicada e Não reproduzível.

## Alterar o workflow de um projeto em uso

Ao trocar o workflow de um projeto que já tem issues, a FlowDesk pede que você relacione cada status antigo a um status novo. As issues são migradas automaticamente depois da confirmação, e a ação não pode ser desfeita.
