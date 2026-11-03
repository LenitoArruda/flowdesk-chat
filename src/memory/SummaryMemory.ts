import { settings } from "../config/settings.ts";
import type { LlmClient } from "../llm/LlmClient.ts";
import type { MemoryRepository } from "../repositories/memoryRepository.ts";
import type { Message } from "../shared/types.ts";
import { estimateTokens } from "../shared/text.ts";

const SUMMARY_PROMPT = `Você resume conversas de suporte da FlowDesk (plataforma de gerenciamento de tarefas).
Resuma em um único parágrafo curto: o que o usuário perguntou, o que já foi respondido e qualquer contexto necessário para continuar a conversa (plano, projeto, ferramentas citadas).
Não inclua senhas, tokens ou dados pessoais. Não invente nada que não esteja na conversa.`;

type Options = {
    summaryThresholdTokens: number;
    keepRecentMessages: number;
};

export type SessionMemory = {
    summary?: string;
    /** Messages not covered by the summary yet. */
    recentMessages: Message[];
    coveredMessages: number;
};

/**
 * Keeps long conversations inside the context budget. The full history stays in the
 * message repository; this class only tracks how much of it is already summarized.
 */
export class SummaryMemory {
    private llm: LlmClient;
    private repo: MemoryRepository;
    private options: Options;

    constructor(llm: LlmClient, repo: MemoryRepository, options: Options = settings.memory) {
        this.llm = llm;
        this.repo = repo;
        this.options = options;
    }

    /** Splits a session's full history into (summary, still-verbatim messages). */
    load(sessionId: string, history: Message[]): SessionMemory {
        const saved = this.repo.getSummary(sessionId);
        const covered = Math.min(saved?.coveredMessages ?? 0, history.length);

        return {
            summary: saved?.summary,
            recentMessages: history.slice(covered),
            coveredMessages: covered,
        };
    }

    /** Summarizes the older messages only when the verbatim part exceeds the token threshold. */
    async compressIfNeeded(sessionId: string, memory: SessionMemory): Promise<SessionMemory> {
        const tokens = memory.recentMessages.reduce((sum, message) => sum + estimateTokens(message.content), 0);
        const { keepRecentMessages, summaryThresholdTokens } = this.options;

        if (tokens <= summaryThresholdTokens || memory.recentMessages.length <= keepRecentMessages) {
            return memory;
        }

        const older = memory.recentMessages.slice(0, -keepRecentMessages);
        const kept = memory.recentMessages.slice(-keepRecentMessages);

        const transcript = older
            .map(message => `${message.role === "user" ? "Usuário" : "Assistente"}: ${message.content}`)
            .join("\n");
        const previous = memory.summary ? `Resumo anterior: ${memory.summary}\n\n` : "";

        const summary = (
            await this.llm.chat(
                [
                    { role: "system", content: SUMMARY_PROMPT },
                    { role: "user", content: `${previous}Conversa:\n${transcript}` },
                ],
                { task: "summary" }
            )
        ).trim();

        const coveredMessages = memory.coveredMessages + older.length;
        this.repo.saveSummary(sessionId, { summary, coveredMessages });

        return { summary, recentMessages: kept, coveredMessages };
    }
}
