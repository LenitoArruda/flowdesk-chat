import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SupportAssistant } from "../assistant/SupportAssistant.ts";
import type { TurnResult } from "../assistant/SupportAssistant.ts";
import { DOCUMENTS_DIR, ROOT_DIR } from "../config/paths.ts";
import { ingestDocuments } from "../knowledge/ingest.ts";
import { loadDocuments } from "../knowledge/loadDocuments.ts";
import { Retriever } from "../knowledge/Retriever.ts";
import type { ChatOptions, LlmClient, LlmTask } from "../llm/LlmClient.ts";
import { OpenAiClient } from "../llm/OpenAiClient.ts";
import { MemoryRepository } from "../repositories/memoryRepository.ts";
import { MessageRepository } from "../repositories/messageRepository.ts";
import { VectorRepository } from "../repositories/vectorRepository.ts";
import type { Message } from "../shared/types.ts";

/**
 * Collects raw evidence for the evaluation report: for every case, what was retrieved, what
 * was answered, which rule decided, how long it took and how many model calls it cost.
 * Grading (fidelity, coherence) is done afterwards by reading this output.
 */

type Turn = { text: string; session?: string };
type Case = {
    id: string;
    group: string;
    turns: Turn[];
    expectedSources: string[];
    expectation: string;
    memoryDependent?: boolean;
};

type Usage = Record<LlmTask | "embed", { calls: number; inChars: number; outChars: number }>;

const emptyUsage = (): Usage => ({
    scope: { calls: 0, inChars: 0, outChars: 0 },
    answer: { calls: 0, inChars: 0, outChars: 0 },
    summary: { calls: 0, inChars: 0, outChars: 0 },
    facts: { calls: 0, inChars: 0, outChars: 0 },
    embed: { calls: 0, inChars: 0, outChars: 0 },
});

/** Decorator that counts calls and characters per task. */
class MeteredLlm implements LlmClient {
    usage: Usage = emptyUsage();
    private inner: LlmClient;

    constructor(inner: LlmClient) {
        this.inner = inner;
    }

    async chat(messages: Message[], options: ChatOptions): Promise<string> {
        const output = await this.inner.chat(messages, options);
        const entry = this.usage[options.task];
        entry.calls++;
        entry.inChars += messages.reduce((sum, message) => sum + message.content.length, 0);
        entry.outChars += output.length;
        return output;
    }

    async embed(input: string): Promise<number[]> {
        const entry = this.usage.embed;
        entry.calls++;
        entry.inChars += input.length;
        return this.inner.embed(input);
    }

    reset(): Usage {
        const previous = this.usage;
        this.usage = emptyUsage();
        return previous;
    }
}

const cases: Case[] = JSON.parse(readFileSync(resolve(ROOT_DIR, "evals/report-cases.json"), "utf-8"));

const llm = new MeteredLlm(new OpenAiClient());
const vectors = new VectorRepository(":memory:");
const ingestStart = Date.now();
const ingestReport = await ingestDocuments(loadDocuments(DOCUMENTS_DIR), vectors, llm);
const ingestUsage = llm.reset();
const ingestMs = Date.now() - ingestStart;

const assistant = new SupportAssistant({
    llm,
    retriever: new Retriever(llm, vectors),
    messageRepository: new MessageRepository(":memory:"),
    memoryRepository: new MemoryRepository(":memory:"),
});

const runId = Date.now().toString(36);
const results = [];

for (const testCase of cases) {
    const userId = `report-${runId}-${testCase.id}`;
    const turns = [];

    for (const turn of testCase.turns) {
        const start = Date.now();
        const result: TurnResult = await assistant.handleTurn({
            userId,
            sessionId: `${userId}-${turn.session ?? "A"}`,
            text: turn.text,
        });
        const ms = Date.now() - start;

        turns.push({
            question: turn.text,
            session: turn.session ?? "A",
            outcome: result.outcome,
            refusalReason: result.refusalReason ?? null,
            answer: result.answer,
            cited: result.sources.map(source => `${source.source}§${source.section}`),
            retrieved: result.retrieved.map(chunk => ({ source: chunk.source, section: chunk.section, score: Number(chunk.score.toFixed(3)) })),
            rules: result.trace.filter(entry => entry.outcome !== "info").map(entry => `${entry.rule}:${entry.outcome}`),
            profile: result.trace.find(entry => entry.rule === "memory.user_profile")?.detail ?? null,
            contextTokens: result.context?.totalTokens ?? null,
            ms,
            usage: llm.reset(),
        });

        console.log(`${testCase.id} [${turn.session ?? "A"}] ${result.outcome}${result.refusalReason ? `/${result.refusalReason}` : ""} ${ms}ms`);
    }

    results.push({ ...testCase, turns });
}

const outDir = resolve(ROOT_DIR, "evals/results");
mkdirSync(outDir, { recursive: true });
const file = resolve(outDir, process.argv[2] ?? "report-run.json");
writeFileSync(
    file,
    JSON.stringify(
        {
            runId,
            date: new Date().toISOString(),
            models: { chat: "gpt-4o-mini", embedding: "text-embedding-3-small" },
            knowledgeBase: { ...ingestReport, ingestMs, ingestUsage },
            results,
        },
        null,
        2
    )
);
console.log(`\nResultados salvos em ${file}`);
