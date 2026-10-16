import { ContextWindow } from "./contextWindows.ts";

export function estimateTokens(contextWindow: ContextWindow): number {
    const averageCharsPerToken = 3; // Estimativa de caracteres por token

    const totalChars = contextWindow.getMessages().reduce((totalTokens, message) => {
        const messageLength = message.content.length;
        const estimatedTokens = Math.ceil(messageLength / averageCharsPerToken);
        return totalTokens + estimatedTokens;
    }, 0);
    const tokenCount = Math.ceil(totalChars / averageCharsPerToken);
    return tokenCount;
}