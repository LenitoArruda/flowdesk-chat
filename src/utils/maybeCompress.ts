import type { ContextWindow } from "./contextWindows.ts";
import { estimateTokens } from "./estimateTokens.ts";
import { summarizeHistory } from "./sumamarizeHistory.ts";
import type { Message } from "./types.ts";

const MAX_TOKENS = 4096;

export async function maybeCompress(contextWindow: ContextWindow): Promise<Message[]> {
    const tokenCount = estimateTokens(contextWindow);

    if (tokenCount > MAX_TOKENS) {
        const currentTokenCount = estimateTokens(contextWindow);

        if (currentTokenCount < MAX_TOKENS) {
            return contextWindow.getMessages();
        }
    }

    const half = Math.floor(contextWindow.getMessages().length / 2);
    const messagesToKeep = contextWindow.getMessages().slice(half);
    const messagesToSumarize = contextWindow.getMessages().slice(0, half);

    const summary = await summarizeHistory(messagesToSumarize);

    return [
        {
            role: "user",
            content: `Resumo das mensagens anteriores: ${summary}`
        },
        {
            role: "assistant",
            content: "Entendido, vou continuar a partir desse ponto."
        },
        ...messagesToKeep
    ];
}