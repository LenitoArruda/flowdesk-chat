import { ContextBuilder } from "../context/ContextBuilder.ts";
import type { ContextReport } from "../context/ContextBuilder.ts";
import { RULES, SYSTEM_PROMPT } from "../context/prompts.ts";
import type { Retriever } from "../knowledge/Retriever.ts";
import type { RetrievedChunk } from "../knowledge/types.ts";
import type { LlmClient } from "../llm/LlmClient.ts";
import { LongTermMemory } from "../memory/LongTermMemory.ts";
import { ShortTermMemory } from "../memory/ShortTermMemory.ts";
import { SummaryMemory } from "../memory/SummaryMemory.ts";
import type { MemoryRepository } from "../repositories/memoryRepository.ts";
import type { MessageRepository } from "../repositories/messageRepository.ts";
import { checkInput } from "../rules/inputRules.ts";
import { checkOutput } from "../rules/outputGuard.ts";
import { ACKNOWLEDGE_REPLY, CLARIFY_REPLY, REFUSALS, SMALLTALK_REPLY } from "../rules/refusals.ts";
import { ScopeGuard } from "../rules/ScopeGuard.ts";
import type { RefusalReason, TraceEntry } from "../rules/types.ts";
import type { Message } from "../shared/types.ts";

export type TurnInput = {
    userId: string;
    sessionId: string;
    text: string;
};

export type Source = {
    /** The `[n]` used in the answer. */
    index: number;
    source: string;
    title: string;
    section: string;
    score: number;
};

export type TurnResult = {
    answer: string;
    outcome: "answered" | "refused" | "smalltalk" | "clarification" | "acknowledged";
    refusalReason?: RefusalReason;
    /** Sources the answer actually cites. */
    sources: Source[];
    /** Everything the retriever returned for this turn, cited or not (used by the evaluation report). */
    retrieved: Omit<Source, "index">[];
    /** Audit trail of every stage and rule that decided this turn. */
    trace: TraceEntry[];
    context?: ContextReport;
};

export type AssistantDependencies = {
    llm: LlmClient;
    retriever: Retriever;
    messageRepository: MessageRepository;
    memoryRepository: MemoryRepository;
    contextBuilder?: ContextBuilder;
    /** Overrides when long conversations are summarized (defaults to `settings.memory`). */
    summaryOptions?: { summaryThresholdTokens: number; keepRecentMessages: number };
};

/** Short follow-ups ("e no plano Free?") are searched together with the previous question. */
const FOLLOW_UP_MAX_LENGTH = 60;

/**
 * Orchestrates one conversation turn. It owns no logic of its own beyond ordering: every
 * decision lives in a module (rules, memory, knowledge, context) that can be tested alone.
 *
 * input rules → memory → scope → learn facts → retrieval → context → generation → output guard → persist
 */
export class SupportAssistant {
    private llm: LlmClient;
    private retriever: Retriever;
    private messages: MessageRepository;
    private scopeGuard: ScopeGuard;
    private summaryMemory: SummaryMemory;
    private longTermMemory: LongTermMemory;
    private contextBuilder: ContextBuilder;

    constructor(deps: AssistantDependencies) {
        this.llm = deps.llm;
        this.retriever = deps.retriever;
        this.messages = deps.messageRepository;
        this.scopeGuard = new ScopeGuard(deps.llm);
        this.summaryMemory = new SummaryMemory(deps.llm, deps.memoryRepository, deps.summaryOptions);
        this.longTermMemory = new LongTermMemory(deps.llm, deps.memoryRepository);
        this.contextBuilder = deps.contextBuilder ?? new ContextBuilder();
    }

    async handleTurn({ userId, sessionId, text }: TurnInput): Promise<TurnResult> {
        const trace: TraceEntry[] = [];
        let retrieved: TurnResult["retrieved"] = [];
        const refuse = (reason: RefusalReason, entry: Omit<TraceEntry, "outcome">, persist: boolean): TurnResult => {
            trace.push({ ...entry, outcome: "block" });
            if (persist) this.persist(sessionId, text, REFUSALS[reason]);
            return { answer: REFUSALS[reason], outcome: "refused", refusalReason: reason, sources: [], retrieved, trace };
        };

        // 1. Deterministic input rules, before spending any model call.
        const inputCheck = checkInput(text);
        if (!inputCheck.allowed) {
            return refuse(inputCheck.reason, { stage: "input", rule: inputCheck.rule, detail: inputCheck.detail }, false);
        }
        trace.push({ stage: "input", rule: "input.rules", outcome: "pass" });

        // 2. Conversation memory: summary of the old part + verbatim recent messages.
        const history = this.messages.load(sessionId);
        const sessionMemory = this.summaryMemory.load(sessionId, history);
        const shortTerm = new ShortTermMemory();
        shortTerm.restore(sessionMemory.recentMessages);
        trace.push({
            stage: "memory",
            rule: "memory.session",
            outcome: "info",
            detail: `${sessionMemory.recentMessages.length} mensagens recentes${sessionMemory.summary ? " + resumo" : ""}`,
        });

        // 3. Scope: the assistant only talks about the platform.
        const scope = await this.scopeGuard.classify(text, shortTerm.getMessages());
        if (scope.label === "smalltalk") {
            trace.push({ stage: "scope", rule: "scope.smalltalk", outcome: "pass", detail: scope.source });
            return { answer: SMALLTALK_REPLY, outcome: "smalltalk", sources: [], retrieved, trace };
        }
        if (scope.label === "ambiguous") {
            trace.push({ stage: "scope", rule: "scope.ambiguous", outcome: "pass", detail: scope.reason });
            return { answer: CLARIFY_REPLY, outcome: "clarification", sources: [], retrieved, trace };
        }
        if (scope.label === "statement") {
            const learned = await this.longTermMemory.learn(userId, text);
            trace.push({ stage: "scope", rule: "scope.statement", outcome: "pass", detail: `${learned.length} fato(s) aprendido(s)` });
            this.persist(sessionId, text, ACKNOWLEDGE_REPLY);
            return { answer: ACKNOWLEDGE_REPLY, outcome: "acknowledged", sources: [], retrieved, trace };
        }
        if (scope.label === "injection") {
            return refuse("prompt_injection", { stage: "scope", rule: "scope.injection", detail: scope.reason }, false);
        }
        if (scope.label === "out_of_scope") {
            return refuse("out_of_scope", { stage: "scope", rule: "scope.out_of_scope", detail: scope.reason }, false);
        }
        trace.push({ stage: "scope", rule: "scope.in_scope", outcome: "pass", detail: scope.reason });

        // 4. Long-term memory: learn from this message first so it can already shape this answer.
        const learned = await this.longTermMemory.learn(userId, text);
        const profile = this.longTermMemory.recall(userId, text);
        trace.push({
            stage: "memory",
            rule: "memory.user_profile",
            outcome: "info",
            detail: `${learned.length} fato(s) aprendido(s); ${profile.length} no contexto`,
        });

        // 5. Knowledge: no relevant documentation means no model call at all.
        const chunks = await this.retriever.retrieve(buildRetrievalQuery(text, shortTerm.getMessages()));
        retrieved = chunks.map(chunk => ({ source: chunk.source, title: chunk.title, section: chunk.section, score: chunk.score }));
        if (chunks.length === 0) {
            return refuse("no_knowledge", { stage: "retrieval", rule: "retrieval.min_score", detail: "nenhum trecho relevante" }, true);
        }
        trace.push({
            stage: "retrieval",
            rule: "retrieval.hybrid",
            outcome: "pass",
            detail: chunks.map(chunk => `${chunk.source}§${chunk.section} (${chunk.score.toFixed(2)})`).join("; "),
        });

        // 6. Context assembly under a token budget.
        const context = this.contextBuilder.build({
            system: SYSTEM_PROMPT,
            rules: RULES,
            userProfile: profile,
            summary: sessionMemory.summary,
            knowledge: chunks,
            recentMessages: shortTerm.getMessages(),
            question: text,
        });
        trace.push({
            stage: "context",
            rule: "context.budget",
            outcome: "info",
            detail: `${context.report.totalTokens}/${context.report.budget} tokens${context.report.dropped.length ? `; descartado: ${context.report.dropped.join(", ")}` : ""}`,
        });

        // 7. Generation.
        const answer = (await this.llm.chat(context.messages, { task: "answer", temperature: 0.1 })).trim();
        trace.push({ stage: "generation", rule: "generation.answer", outcome: "info" });

        // 8. Output guard: the answer must be traceable to the documentation.
        const outputCheck = checkOutput({ answer, chunks: context.knowledge, question: text, allowedText: profile });
        if (!outputCheck.allowed) {
            return refuse(outputCheck.reason, { stage: "output", rule: outputCheck.rule, detail: outputCheck.detail }, true);
        }
        trace.push({ stage: "output", rule: "output.guard", outcome: "pass" });

        // 9. Persist the turn and compress the conversation if it outgrew its budget.
        this.persist(sessionId, text, answer);
        await this.summaryMemory.compressIfNeeded(sessionId, {
            ...sessionMemory,
            recentMessages: [...sessionMemory.recentMessages, { role: "user", content: text }, { role: "assistant", content: answer }],
        });

        return {
            answer,
            outcome: "answered",
            sources: citedSources(answer, context.knowledge),
            retrieved,
            trace,
            context: context.report,
        };
    }

    private persist(sessionId: string, question: string, answer: string): void {
        this.messages.save(sessionId, { role: "user", content: question });
        this.messages.save(sessionId, { role: "assistant", content: answer });
    }
}

function buildRetrievalQuery(text: string, recent: Message[]): string {
    const previousQuestion = [...recent].reverse().find(message => message.role === "user");

    return previousQuestion && text.length < FOLLOW_UP_MAX_LENGTH ? `${previousQuestion.content} ${text}` : text;
}

function citedSources(answer: string, chunks: RetrievedChunk[]): Source[] {
    const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1])));

    return chunks
        .map((chunk, index) => ({ index: index + 1, source: chunk.source, title: chunk.title, section: chunk.section, score: chunk.score }))
        .filter(source => cited.has(source.index));
}
