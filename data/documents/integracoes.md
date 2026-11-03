---
title: Integrações
category: integracoes
---

A FlowDesk se conecta com ferramentas de desenvolvimento e comunicação para manter o trabalho sincronizado.

## Integrações disponíveis

As integrações nativas são GitHub, GitLab, Slack, Microsoft Teams e Google Calendar. Para instalar, vá em Configurações da organização > Integrações, escolha a ferramenta e clique em "Conectar". Apenas administradores da organização podem instalar integrações.

## GitHub e GitLab

Depois de conectar o repositório, inclua a chave da issue na mensagem do commit, no nome da branch ou no título do pull request, por exemplo APP-123. A FlowDesk vincula automaticamente esses itens à issue e mostra o estado do pull request na própria issue. Você pode configurar uma regra de automação para mover a issue para Em revisão quando um pull request for aberto e para Concluído quando for aprovado e mesclado.

## Slack e Microsoft Teams

Com Slack ou Teams conectado, é possível receber notificações de um projeto em um canal e criar issues com o comando /flowdesk criar. Cada projeto pode ser vinculado a um canal diferente em Configurações do projeto > Notificações.

## Google Calendar

A integração com o Google Calendar exibe os prazos das issues atribuídas a você e as datas das sprints em uma agenda dedicada. A sincronização é somente de leitura: alterar o evento no calendário não altera a issue.

## Webhooks e API

Os planos Business e Enterprise permitem criar webhooks em Configurações da organização > Webhooks para enviar eventos a sistemas externos. A API REST está disponível em todos os planos, e o token de acesso é gerado em Perfil > Tokens de API. Cada token tem o limite de 100 requisições por minuto.

## Desconectar uma integração

Para remover uma integração, abra a mesma tela de Integrações e clique em "Desconectar". Os vínculos já criados nas issues são mantidos, mas deixam de ser atualizados.
