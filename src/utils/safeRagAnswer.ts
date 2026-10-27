import { VectorRepository } from "../vectorRepository.ts";
import { embed } from "./embed.ts";
import { ragAnswer } from "./ragAnswer.ts";

export async function safeRagAnswer(
    question: string,
    repo: VectorRepository,
    blockedSignals: string[]
) {
    // 1. embeds a peregunta
    const questionEmbedding = await embed(question);
    const results = repo.search(question, questionEmbedding);

    // guarda 1: validar que a pergunta não tente extrair informações fora de escopo
    if (blockedSignals.some(signal => question.toLowerCase().includes(signal.toLowerCase()))) {
        return "Não posso responder a essa pergunta com base nos documentos disponíveis";
    }

    // guarda 2: verificar se há contexto minimamente relevante antes de chamar o LLM
    if (results.length === 0) {
        return "Não encontrei informações suficientes para essa pergunta";
    }

    return ragAnswer(question, repo);
};