import OpenAI from "openai";
import { settings } from "../config/settings.ts";
import { withRetry } from "../shared/withRetry.ts";
import type { Message } from "../shared/types.ts";
import type { ChatOptions, LlmClient } from "./LlmClient.ts";

export class OpenAiClient implements LlmClient {
    private client: OpenAI;

    constructor(apiKey: string | undefined = process.env.OPENAI_API_KEY) {
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY is not set. Copy .env.example to .env.local and fill it in.");
        }
        this.client = new OpenAI({ apiKey });
    }

    async chat(messages: Message[], options: ChatOptions): Promise<string> {
        const response = await withRetry(() =>
            this.client.chat.completions.create({
                model: settings.models.chat,
                messages,
                temperature: options.temperature ?? 0,
                ...(options.json ? { response_format: { type: "json_object" as const } } : {}),
            })
        );

        return response.choices[0]?.message.content ?? "";
    }

    async embed(input: string): Promise<number[]> {
        const response = await withRetry(() =>
            this.client.embeddings.create({
                model: settings.models.embedding,
                input,
            })
        );

        return response.data[0].embedding;
    }
}
