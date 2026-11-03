import type { ChatOptions, LlmClient, LlmTask } from "../../src/llm/LlmClient.ts";
import type { Message } from "../../src/shared/types.ts";
import { keywords } from "../../src/shared/text.ts";

type Handler = (messages: Message[], options: ChatOptions) => string;

export type RecordedCall = {
    task: LlmTask;
    messages: Message[];
};

/** Deterministic bag-of-words embedding: similar vocabulary => high cosine similarity. */
export function fakeEmbedding(text: string, dimensions = 512): number[] {
    const vector = new Array<number>(dimensions).fill(0);

    for (const word of keywords(text, 2)) {
        let hash = 2166136261;
        for (const char of word) {
            hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
        }
        vector[hash % dimensions] += 1;
    }

    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return norm === 0 ? vector : vector.map(value => value / norm);
}

/** Scripted LLM: one handler per task, every call recorded so tests can assert on what was (not) sent. */
export class FakeLlm implements LlmClient {
    calls: RecordedCall[] = [];
    private handlers: Partial<Record<LlmTask, Handler>>;

    constructor(handlers: Partial<Record<LlmTask, Handler>> = {}) {
        this.handlers = handlers;
    }

    async chat(messages: Message[], options: ChatOptions): Promise<string> {
        this.calls.push({ task: options.task, messages });

        const handler = this.handlers[options.task];
        if (!handler) throw new Error(`FakeLlm has no handler for task "${options.task}"`);

        return handler(messages, options);
    }

    async embed(input: string): Promise<number[]> {
        return fakeEmbedding(input);
    }

    callsFor(task: LlmTask): RecordedCall[] {
        return this.calls.filter(call => call.task === task);
    }
}
