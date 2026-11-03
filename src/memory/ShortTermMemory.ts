import { settings } from "../config/settings.ts";
import type { Message } from "../shared/types.ts";

/** Sliding window over the part of the conversation that is not summarized yet. */
export class ShortTermMemory {
    private messages: Message[] = [];
    private maxMessages: number;

    constructor(maxMessages: number = settings.memory.maxHistoryMessages) {
        this.maxMessages = maxMessages;
    }

    /** Replaces the window with persisted messages (e.g. when a session is resumed). */
    restore(messages: Message[]): void {
        this.messages = messages.slice(-this.maxMessages);
    }

    add(message: Message): void {
        this.messages.push(message);
        this.messages = this.messages.slice(-this.maxMessages);
    }

    getMessages(): Message[] {
        return [...this.messages];
    }
}
