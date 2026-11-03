import type { Message } from "../shared/types.ts";

/** Why the model is being called. Lets fakes and logs tell the calls apart. */
export type LlmTask = "scope" | "answer" | "summary" | "facts";

export type ChatOptions = {
    task: LlmTask;
    temperature?: number;
    /** Ask the model for a JSON object. */
    json?: boolean;
};

/** The only surface the application uses to talk to a language model. */
export interface LlmClient {
    chat(messages: Message[], options: ChatOptions): Promise<string>;
    embed(input: string): Promise<number[]>;
}
