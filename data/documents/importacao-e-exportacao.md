---
title: Importação e exportação de dados
category: dados
---

É possível trazer dados de outras ferramentas para a FlowDesk e exportar seus dados quando precisar.

## Importar issues de um arquivo CSV

Em Configurações do projeto > Importar, escolha "Arquivo CSV" e envie o arquivo. Cada arquivo pode ter até 5.000 linhas. Na tela seguinte, relacione cada coluna do CSV a um campo da FlowDesk. Título e tipo são obrigatórios. Revise a prévia e confirme para iniciar a importação, que acontece em segundo plano.

## Importar de outras ferramentas

Os planos Business e Enterprise permitem importar projetos diretamente do Jira e do Trello usando a conta da ferramenta de origem. A importação traz issues, comentários, anexos e responsáveis, desde que as pessoas já existam na FlowDesk com o mesmo e-mail.

## Erros comuns de importação

Se a importação falhar, abra o relatório de importação para ver as linhas com erro. As causas mais comuns são título vazio, tipo de issue inexistente, e-mail de responsável que não pertence à organização e datas fora do formato AAAA-MM-DD. Corrija o arquivo e importe novamente apenas as linhas com erro.

## Exportar issues

Na lista de resultados de uma busca, clique em "Exportar" e escolha CSV ou JSON. A exportação inclui os campos exibidos nas colunas atuais. Cada exportação tem o limite de 10.000 issues; para volumes maiores, divida a busca por período.

## Exportar um projeto completo

Administradores do projeto podem solicitar a exportação completa em Configurações do projeto > Exportar projeto. O arquivo, em formato ZIP com JSON e anexos, é gerado em segundo plano, e o link de download chega por e-mail e é válido por 48 horas.

## Backup

A FlowDesk mantém backups automáticos diários, mas eles são destinados à recuperação de desastres da plataforma e não estão disponíveis para restauração pelo cliente. Para ter cópias suas, use a exportação.
