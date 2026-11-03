import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LongTermMemory } from "../../src/memory/LongTermMemory.ts";
import { ShortTermMemory } from "../../src/memory/ShortTermMemory.ts";
import { SummaryMemory } from "../../src/memory/SummaryMemory.ts";
import { MemoryRepository } from "../../src/repositories/memoryRepository.ts";
import { MessageRepository } from "../../src/repositories/messageRepository.ts";
import type { Message } from "../../src/shared/types.ts";
import { FakeLlm } from "../helpers/fakes.ts";

const conversation = (count: number, size = 40): Message[] =>
    Array.from({ length: count }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `mensagem ${i} ${"x".repeat(size)}`,
    }));

describe("ShortTermMemory", () => {
    it("restores persisted messages (the old ContextWindow.restore was a no-op)", () => {
        const repo = new MessageRepository(":memory:");
        const saved = conversation(4);
        saved.forEach(message => repo.save("s1", message));

        const memory = new ShortTermMemory();
        memory.restore(repo.load("s1"));

        assert.deepEqual(memory.getMessages(), saved);
    });

    it("keeps only the most recent messages", () => {
        const memory = new ShortTermMemory(3);
        conversation(6).forEach(message => memory.add(message));

        assert.deepEqual(memory.getMessages().map(m => m.content.slice(0, 10)), ["mensagem 3", "mensagem 4", "mensagem 5"]);
    });

    it("isolates sessions in the message repository", () => {
        const repo = new MessageRepository(":memory:");
        repo.save("a", { role: "user", content: "da sessão a" });
        repo.save("b", { role: "user", content: "da sessão b" });

        assert.deepEqual(repo.load("a").map(m => m.content), ["da sessão a"]);
    });
});

describe("SummaryMemory", () => {
    const options = { summaryThresholdTokens: 100, keepRecentMessages: 2 };

    it("does not call the model while the history fits the threshold", async () => {
        const llm = new FakeLlm({ summary: () => "não deveria ser chamado" });
        const summaries = new SummaryMemory(llm, new MemoryRepository(":memory:"), { ...options, summaryThresholdTokens: 10_000 });

        const memory = summaries.load("s1", conversation(6));
        const result = await summaries.compressIfNeeded("s1", memory);

        assert.equal(llm.callsFor("summary").length, 0);
        assert.equal(result.summary, undefined);
        assert.equal(result.recentMessages.length, 6);
    });

    it("summarizes older messages once the threshold is exceeded and keeps the latest verbatim", async () => {
        const llm = new FakeLlm({ summary: () => "  O usuário perguntou sobre sprints.  " });
        const repo = new MemoryRepository(":memory:");
        const summaries = new SummaryMemory(llm, repo, options);
        const history = conversation(8);

        const compressed = await summaries.compressIfNeeded("s1", summaries.load("s1", history));

        assert.equal(llm.callsFor("summary").length, 1);
        assert.equal(compressed.summary, "O usuário perguntou sobre sprints.");
        assert.deepEqual(compressed.recentMessages, history.slice(-2));
        assert.equal(compressed.coveredMessages, 6);

        // The next turn (a fresh load from the full persisted history) sees the same split.
        const reloaded = summaries.load("s1", history);
        assert.equal(reloaded.summary, "O usuário perguntou sobre sprints.");
        assert.deepEqual(reloaded.recentMessages, history.slice(-2));
    });

    it("includes the previous summary when compressing again", async () => {
        const llm = new FakeLlm({ summary: () => "novo resumo" });
        const repo = new MemoryRepository(":memory:");
        repo.saveSummary("s1", { summary: "resumo antigo", coveredMessages: 4 });
        const summaries = new SummaryMemory(llm, repo, options);

        const history = conversation(12);
        const result = await summaries.compressIfNeeded("s1", summaries.load("s1", history));

        const sent = llm.callsFor("summary")[0].messages[1].content;
        assert.match(sent, /Resumo anterior: resumo antigo/);
        assert.equal(result.coveredMessages, 10);
        assert.equal(repo.getSummary("s1")?.coveredMessages, 10);
    });
});

describe("LongTermMemory", () => {
    const facts = (...entries: [string, string][]) => JSON.stringify({ facts: entries.map(([key, value]) => ({ key, value })) });

    it("stores durable facts the user states about themselves", async () => {
        const llm = new FakeLlm({ facts: () => facts(["plano", "Business"], ["papel", "administrador da organização"]) });
        const repo = new MemoryRepository(":memory:");
        const memory = new LongTermMemory(llm, repo);

        await memory.learn("ana", "Somos uma equipe no plano Business e eu sou administradora.");

        assert.deepEqual(repo.getFacts("ana"), [
            { key: "papel", value: "administrador da organização" },
            { key: "plano", value: "Business" },
        ]);
        assert.deepEqual(repo.getFacts("outra-pessoa"), []);
    });

    it("skips the model when the message is not about the user", async () => {
        const llm = new FakeLlm({ facts: () => facts(["plano", "Free"]) });
        const memory = new LongTermMemory(llm, new MemoryRepository(":memory:"));

        await memory.learn("ana", "Como criar uma sprint?");

        assert.equal(llm.callsFor("facts").length, 0);
    });

    it("rejects unknown keys, sensitive values and malformed output", async () => {
        const repo = new MemoryRepository(":memory:");

        await new LongTermMemory(
            new FakeLlm({ facts: () => facts(["cor favorita", "azul"], ["ferramentas", "senha: abc123"], ["equipe", "15 pessoas"]) }),
            repo
        ).learn("ana", "Nós somos 15 pessoas.");
        assert.deepEqual(repo.getFacts("ana"), [{ key: "equipe", value: "15 pessoas" }]);

        await new LongTermMemory(new FakeLlm({ facts: () => "isto não é JSON" }), repo).learn("bia", "Eu uso a FlowDesk.");
        assert.deepEqual(repo.getFacts("bia"), []);
    });

    it("never sends messages that contain credentials to the model", async () => {
        const llm = new FakeLlm({ facts: () => facts(["plano", "Free"]) });
        const memory = new LongTermMemory(llm, new MemoryRepository(":memory:"));

        await memory.learn("ana", "Eu uso o token: abc123def456 na integração");

        assert.equal(llm.callsFor("facts").length, 0);
    });

    it("recalls core facts always and other facts only when the question relates to them", () => {
        const repo = new MemoryRepository(":memory:");
        repo.upsertFact("ana", { key: "plano", value: "Business" });
        repo.upsertFact("ana", { key: "ferramentas", value: "GitHub e Slack" });
        repo.upsertFact("ana", { key: "equipe", value: "equipe de design" });
        const memory = new LongTermMemory(new FakeLlm(), repo);

        assert.deepEqual(memory.recall("ana", "Como vincular commits do GitHub às issues?"), ["plano: Business", "ferramentas: GitHub e Slack"]);
        assert.deepEqual(memory.recall("ana", "Como exportar issues?"), ["plano: Business"]);
        assert.deepEqual(memory.recall("desconhecida", "Como exportar issues?"), []);
    });
});
