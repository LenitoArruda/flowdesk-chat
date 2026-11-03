import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContextBuilder } from "../../src/context/ContextBuilder.ts";
import type { ContextInput } from "../../src/context/ContextBuilder.ts";
import type { RetrievedChunk } from "../../src/knowledge/types.ts";
import type { Message } from "../../src/shared/types.ts";

const chunk = (n: number, size = 200): RetrievedChunk => ({
    source: `doc-${n}.md`,
    title: `Doc ${n}`,
    section: "Seção",
    text: `Doc ${n} — Seção\n${"conteúdo ".repeat(size / 9)}`,
    score: 1 - n / 10,
});

const history = (count: number, size = 100): Message[] =>
    Array.from({ length: count }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `mensagem ${i} ${"x".repeat(size)}`,
    }));

const input = (overrides: Partial<ContextInput> = {}): ContextInput => ({
    system: "SISTEMA",
    rules: "REGRA-UM",
    userProfile: ["plano: Business"],
    summary: "Resumo anterior",
    knowledge: [chunk(1), chunk(2)],
    recentMessages: history(4),
    question: "Qual a pergunta atual?",
    ...overrides,
});

describe("ContextBuilder", () => {
    it("orders blocks: system, rules, profile, summary, knowledge, recent messages, question", () => {
        const { messages } = new ContextBuilder({ maxTokens: 10_000, minRecentMessages: 2 }).build(input());

        const system = messages[0];
        assert.equal(system.role, "system");

        const positions = ["SISTEMA", "[REGRAS]", "[PERFIL DO USUÁRIO]", "[RESUMO DA CONVERSA]", "[DOCUMENTAÇÃO]"].map(marker =>
            system.content.indexOf(marker)
        );
        assert.ok(positions.every(position => position >= 0), "all blocks present");
        assert.deepEqual([...positions].sort((a, b) => a - b), positions, "blocks in the documented order");

        assert.match(system.content, /\[1\] \(fonte: doc-1\.md\)/);
        assert.match(system.content, /\[2\] \(fonte: doc-2\.md\)/);

        assert.equal(messages.length, 1 + 4 + 1);
        assert.equal(messages.at(-1)?.content, "Qual a pergunta atual?");
        assert.equal(messages.at(-1)?.role, "user");
    });

    it("marks an empty knowledge section explicitly", () => {
        const { messages } = new ContextBuilder({ maxTokens: 10_000, minRecentMessages: 2 }).build(input({ knowledge: [] }));
        assert.match(messages[0].content, /nenhum trecho relevante/);
    });

    it("stays within the budget by dropping old messages first, then lower-ranked knowledge", () => {
        const builder = new ContextBuilder({ maxTokens: 500, minRecentMessages: 2 });
        const { messages, report } = builder.build(
            input({ knowledge: [chunk(1, 900), chunk(2, 900), chunk(3, 900)], recentMessages: history(10, 150) })
        );

        assert.ok(report.totalTokens <= 500, `used ${report.totalTokens}`);
        assert.equal(report.dropped[0], "recentMessage");
        assert.ok(report.dropped.includes("knowledgeChunk"));
        // all but the minimum number of recent messages go before any knowledge is touched
        assert.ok(report.dropped.indexOf("knowledgeChunk") >= 8);

        // the newest messages survive and the best chunk is kept
        assert.match(messages.at(-2)?.content ?? "", /mensagem 9/);
        assert.match(messages[0].content, /doc-1\.md/);
        assert.doesNotMatch(messages[0].content, /doc-3\.md/);
    });

    it("never drops system, rules or the question, even when the budget is impossible", () => {
        const { messages, report } = new ContextBuilder({ maxTokens: 1, minRecentMessages: 2 }).build(input());

        assert.match(messages[0].content, /SISTEMA/);
        assert.match(messages[0].content, /REGRA-UM/);
        assert.equal(messages.at(-1)?.content, "Qual a pergunta atual?");
        assert.ok(report.dropped.includes("summary"));
        assert.ok(report.dropped.includes("userProfile"));
    });

    it("reports per-block token usage", () => {
        const { report } = new ContextBuilder({ maxTokens: 10_000, minRecentMessages: 2 }).build(input());
        assert.deepEqual(
            report.blocks.map(block => block.id),
            ["system", "rules", "userProfile", "summary", "knowledge", "recentMessages", "question"]
        );
        assert.equal(report.totalTokens, report.blocks.reduce((sum, block) => sum + block.tokens, 0));
    });
});
