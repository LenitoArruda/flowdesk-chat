import crypto from "node:crypto";
import { generateWithCritique } from "./utils/generateWithCritique.ts";
import { PERSONAS } from "./utils/personas.ts";
import { ContextWindow } from "./utils/contextWindows.ts";
import { summarizeHistory } from "./utils/sumamarizeHistory.ts";
import { MessageRepository } from "./utils/messageRepository.ts";

const windowId = process.argv[2] || crypto.randomUUID();
const contextWindow = new ContextWindow();
const messageRepository = new MessageRepository();

console.log(`\n\nSessão iniciada com o identificador: ${windowId} \n\n`);

const initialMessages = messageRepository.load(windowId);

if(initialMessages.length > 0) {
    console.log(`\n\nHistórico de mensagens carregado para a sessão: ${windowId}\n\n`);
    initialMessages.forEach(message => contextWindow.restore(message.role, message.content));
    console.log(`\n\n${initialMessages.length} mensagens carregadas\n\n`);
}

function textAnalysisPrompt(
    params: {
        texto: string;
        employerType: string;
        levelOfDetail: "resumido" | "detalhado";
    }
) {
    return ` Você é um ${params.employerType} que trabalha atualmente na FlowDesk, uma empresa SaaS de gerenciamento de projetos e produtividade.
    Você deve analisar o seguinte texto com nível de detalhe ${params.levelOfDetail}:
    
    ${params.texto}
    `;
}

async function chatWithPersona(persona: keyof typeof PERSONAS, question: string) {
    const systemPrompt = PERSONAS[persona];
    const userMessage = contextWindow.addUserMessage(question);
    messageRepository.save(windowId, userMessage);
    const response = await generateWithCritique(systemPrompt, contextWindow);
    const assistantMessage = contextWindow.addAssistantMessage(response);
    messageRepository.save(windowId, assistantMessage);
    console.log(`\n\n[${persona.toUpperCase()}] resposta:\n`, response);
};

// const perguntaSuporte = `
//     Um cliente informou:

//     "Estou tentando configurar uma nova automação para enviar uma mensagem
//     quando um lead entrar no sistema, mas a automação não está sendo executada.
//     Já configurei duas vezes e continua sem funcionar."

//     Explique como o suporte deve responder ao cliente.
// `;

const perguntaSuporte = `
    Como enviar uma mensagem para outro usuario no FlowDesk.
`;

await chatWithPersona("suporte", textAnalysisPrompt({
    texto: perguntaSuporte,
    employerType: "especialista de suporte",
    levelOfDetail: "detalhado"
}));

await chatWithPersona("suporte", "Minha primeira pergunta foi sobre pagamentos?");
await chatWithPersona("suporte", "QUal é o nome da empresa?");
await chatWithPersona("suporte", "O que é FlowDesk?");

await chatWithPersona("suporte", "Qual foi a minha primeira pergunta?");

console.log("\n\n---------------------------------- RESUMO DO HISTÓRICO DE MENSAGEM ------------------------------- \n\n");

console.log(await summarizeHistory(contextWindow.getMessages()));

console.log("\n\nPra resumir essa sessão utilize o seguinte identificador:", windowId);
// const perguntaAnalista = `
// Analise os seguintes dados de clientes da FlowDesk:

// {
//     "periodo": "Setembro/2026",
//     "novos_clientes": 120,
//     "clientes_cancelados": 18,
//     "clientes_ativos": 850,
//     "clientes_com_uso_diario": 620
//     }
    
//     Gere uma análise sobre a situação dos clientes e indique os principais
//     pontos que deveriam receber atenção da equipe.
//     `;

// await chatWithPersona("analista", textAnalysisPrompt({
//     texto: perguntaAnalista,
//     employerType: "analista de dados",
//     levelOfDetail: "detalhado"
// }));

// const perguntaProduto = `
//     A equipe da FlowDesk recebeu os seguintes feedbacks:

//     1. "O carregamento da página de leads está muito lento."
//     2. "Gostaria de conseguir exportar os leads para Excel."
//     3. "A página de leads demora muito para abrir."
//     4. "Seria útil ter filtros por vendedor."
//     5. "Às vezes preciso esperar vários segundos para visualizar os leads."

//     Analise os feedbacks e apresente:
//     - principais problemas identificados;
//     - sugestões de funcionalidades;
//     - possíveis prioridades para o time de produto.
//     `;

// await chatWithPersona("produto", textAnalysisPrompt({
//     texto: perguntaProduto,
//     employerType: "gerente de produto",
//     levelOfDetail: "detalhado"
// }));
