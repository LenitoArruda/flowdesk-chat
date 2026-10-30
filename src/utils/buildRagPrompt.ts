import type { RagExample } from "./types.ts";

export function buildRagPrompt(
    question: string,
    chunks: string[],
    examples?: RagExample[]
) {
    const context = chunks.join("\n\n---\n\n");
    const fewShot = examples?.map(e => `Q: ${e.q}\nA: ${e.a}`).join("\n\n") ?? "";

    return `
    [INSTRUÇÕES]
    Responda à pergunta usando exclusivamente as informações do contexto.
    Se o contexto contiver informação suficiente, responda de forma direta e objetiva.
    Use "Não encontrei informações suficientes para essa pergunta" somente se o contexto realmente não permitir responder.
    Não invente informações nem inclua fatos que não estejam no contexto.       

    ${fewShot ? `[EXEMPLOS]\n${fewShot}\n\n` : ""}

    [CONTEXT]
    ${context}

    [PERGUNTA]
    ${question}
    `
}