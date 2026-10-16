import type { Message } from "./types.ts";

export class ContextWindow {
    private history: Message[] = [];
    private maxHistoryLength: number;

    constructor(maxHistoryLength: number = 100) {
        this.maxHistoryLength = maxHistoryLength;
    }

    addUserMessage(content: string): Message {
        const message: Message = { role: "user", content };

        this.history.push(message);
        this.slidingWindow();

        return message;
    }

    addAssistantMessage(content: string) {
        const message: Message = { role: "assistant", content };

        this.history.push(message);
        this.slidingWindow();

        return message;
    }

    restore(role: Message["role"], content: string) {
        this.history
    }
    getMessages() {
        return this.history;
    }

    private slidingWindow() {
        const limit = this.maxHistoryLength * 2;

        if (this.history.length > limit) {
            this.history = this.history.slice(-limit);
        }
    }
}