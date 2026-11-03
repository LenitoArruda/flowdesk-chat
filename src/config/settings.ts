export const settings = {
    models: {
        chat: "gpt-4o-mini",
        embedding: "text-embedding-3-small",
    },
    input: {
        maxLength: 1000,
    },
    retrieval: {
        topK: 4,
        // Hybrid score (0.7 semantic + 0.3 keyword). Tune with `npm run eval`.
        minScore: 0.35,
    },
    context: {
        // Total token budget of the prompt sent to the model.
        maxTokens: 6000,
        minRecentMessages: 2,
    },
    memory: {
        // Compress the conversation once its history exceeds this size.
        summaryThresholdTokens: 3000,
        keepRecentMessages: 6,
        maxHistoryMessages: 40,
        maxFactsInContext: 5,
    },
} as const;

export type Settings = typeof settings;
