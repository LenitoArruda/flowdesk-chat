import { settings } from "../config/settings.ts";
import type { RetrievedChunk } from "../knowledge/types.ts";
import type { Message } from "../shared/types.ts";
import { estimateTokens } from "../shared/text.ts";

export type ContextInput = {
    system: string;
    rules: string;
    /** Durable facts about the user (long-term memory). */
    userProfile?: string[];
    /** Summary of the older part of the conversation. */
    summary?: string;
    /** Retrieved knowledge, best score first. */
    knowledge: RetrievedChunk[];
    recentMessages: Message[];
    question: string;
};

export type ContextReport = {
    budget: number;
    totalTokens: number;
    blocks: { id: string; tokens: number }[];
    /** What was removed to fit the budget, in the order it happened. */
    dropped: string[];
};

export type BuiltContext = {
    messages: Message[];
    report: ContextReport;
};

type Options = {
    maxTokens: number;
    minRecentMessages: number;
};

/**
 * Assembles the prompt from typed blocks in a fixed order:
 * system → rules → user profile → summary → knowledge → recent messages → question.
 * `system`, `rules` and `question` are never dropped; when over budget the least valuable
 * context goes first: older messages (down to a minimum), then lower-scored knowledge
 * (down to one chunk), then the remaining messages, summary and profile.
 */
export class ContextBuilder {
    private options: Options;

    constructor(options: Options = settings.context) {
        this.options = options;
    }

    build(input: ContextInput): BuiltContext {
        let profile = input.userProfile?.length ? input.userProfile : undefined;
        let summary = input.summary || undefined;
        let knowledge = [...input.knowledge];
        let recent = [...input.recentMessages];
        const dropped: string[] = [];

        const render = () => this.render({ ...input, userProfile: profile, summary, knowledge, recentMessages: recent });

        while (render().report.totalTokens > this.options.maxTokens) {
            if (recent.length > this.options.minRecentMessages) {
                recent = recent.slice(1);
                dropped.push("recentMessage");
            } else if (knowledge.length > 1) {
                knowledge = knowledge.slice(0, -1);
                dropped.push("knowledgeChunk");
            } else if (recent.length > 0) {
                recent = recent.slice(1);
                dropped.push("recentMessage");
            } else if (summary) {
                summary = undefined;
                dropped.push("summary");
            } else if (profile) {
                profile = undefined;
                dropped.push("userProfile");
            } else {
                break;
            }
        }

        const built = render();
        built.report.dropped = dropped;
        return built;
    }

    private render(input: ContextInput): BuiltContext {
        const sections: { id: string; text: string }[] = [
            { id: "system", text: input.system },
            { id: "rules", text: `[REGRAS]\n${input.rules}` },
        ];

        if (input.userProfile?.length) {
            sections.push({ id: "userProfile", text: `[PERFIL DO USUÁRIO]\n${input.userProfile.map(fact => `- ${fact}`).join("\n")}` });
        }

        if (input.summary) {
            sections.push({ id: "summary", text: `[RESUMO DA CONVERSA]\n${input.summary}` });
        }

        sections.push({
            id: "knowledge",
            text: input.knowledge.length
                ? `[DOCUMENTAÇÃO]\n${input.knowledge.map((chunk, index) => `[${index + 1}] (fonte: ${chunk.source})\n${chunk.text}`).join("\n\n")}`
                : "[DOCUMENTAÇÃO]\n(nenhum trecho relevante encontrado)",
        });

        const messages: Message[] = [
            { role: "system", content: sections.map(section => section.text).join("\n\n") },
            ...input.recentMessages,
            { role: "user", content: input.question },
        ];

        const blocks = [
            ...sections.map(section => ({ id: section.id, tokens: estimateTokens(section.text) })),
            { id: "recentMessages", tokens: estimateTokens(input.recentMessages.map(message => message.content).join("\n")) },
            { id: "question", tokens: estimateTokens(input.question) },
        ];

        return {
            messages,
            report: {
                budget: this.options.maxTokens,
                totalTokens: blocks.reduce((sum, block) => sum + block.tokens, 0),
                blocks,
                dropped: [],
            },
        };
    }
}
