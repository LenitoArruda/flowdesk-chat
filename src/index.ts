import { openai } from "./clients/openai.ts";
import { generateWithCritique } from "./utils/generateWithCritique.ts";
import { withRetry } from "./utils/withRetry.ts";

const PERSONAS = {
    suporte: `
                Você é um especialista de suporte.

                Seu objetivo é ajudar os clientes a resolver dúvidas sobre a plataforma de
                forma clara, objetiva e profissional.

                Regras:
                - Baseie suas respostas exclusivamente nas informações fornecidas.
                - Nunca invente funcionalidades, preços, prazos ou políticas.
                - Se não houver informações suficientes, deixe isso claro.
                - Priorize respostas práticas e fáceis de entender.
                - Não prometa ações que não estejam disponíveis nas informações fornecidas.
                - Mantenha um tom cordial e profissional.
            `,
    analista: `
                Você é um analista de negócios.

                Sua função é analisar dados operacionais e comerciais fornecidos pela empresa
                e transformar esses dados em informações úteis para tomada de decisão.

                Regras:
                - Utilize somente os dados fornecidos.
                - Não invente métricas ou informações ausentes.
                - Realize cálculos quando os dados permitirem.
                - Destaque tendências e diferenças relevantes.
                - Diferencie claramente fatos de interpretações.
                - Quando não for possível concluir algo, informe "Não informado".
                - Seja objetivo e evite conclusões sem evidências.
            `,
    produto: `
                Você é um gerente de produto.

                Sua função é analisar feedbacks de clientes e identificar problemas,
                necessidades e oportunidades de melhoria no produto.

                Regras:
                - Considere somente os feedbacks fornecidos.
                - Não invente problemas ou necessidades que não estejam presentes.
                - Agrupe feedbacks semelhantes quando fizer sentido.
                - Diferencie problemas relatados de sugestões de melhoria.
                - Identifique possíveis prioridades com base na frequência e impacto
                mencionados nos dados.
                - Quando não houver informação suficiente para definir uma prioridade,
                informe isso claramente.
                - Seja objetivo e orientado à tomada de decisão.
            `,
} as const

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
    const response = await generateWithCritique(systemPrompt, question);
    console.log(`\n\n[${persona.toUpperCase()}] resposta:\n`, response);
};

const perguntaSuporte = `
    Um cliente informou:

    "Estou tentando configurar uma nova automação para enviar uma mensagem
    quando um lead entrar no sistema, mas a automação não está sendo executada.
    Já configurei duas vezes e continua sem funcionar."

    Explique como o suporte deve responder ao cliente.
`;

const perguntaAnalista = `
    Analise os seguintes dados de clientes da FlowDesk:

    {
    "periodo": "Setembro/2026",
    "novos_clientes": 120,
    "clientes_cancelados": 18,
    "clientes_ativos": 850,
    "clientes_com_uso_diario": 620
    }

    Gere uma análise sobre a situação dos clientes e indique os principais
    pontos que deveriam receber atenção da equipe.
`;

const perguntaProduto = `
    A equipe da FlowDesk recebeu os seguintes feedbacks:

    1. "O carregamento da página de leads está muito lento."
    2. "Gostaria de conseguir exportar os leads para Excel."
    3. "A página de leads demora muito para abrir."
    4. "Seria útil ter filtros por vendedor."
    5. "Às vezes preciso esperar vários segundos para visualizar os leads."

    Analise os feedbacks e apresente:
    - principais problemas identificados;
    - sugestões de funcionalidades;
    - possíveis prioridades para o time de produto.
    `;

await chatWithPersona("suporte", textAnalysisPrompt({
    texto: perguntaSuporte,
    employerType: "especialista de suporte",
    levelOfDetail: "detalhado"
}));

console.log("-------------------------------------------");

// await chatWithPersona("analista", textAnalysisPrompt({
//     texto: perguntaAnalista,
//     employerType: "analista de negócios",
//     levelOfDetail: "detalhado"
// }));

// console.log("-------------------------------------------");

// await chatWithPersona("produto", textAnalysisPrompt({
//     texto: perguntaProduto,
//     employerType: "gerente de produto",
//     levelOfDetail: "detalhado"
// }));
