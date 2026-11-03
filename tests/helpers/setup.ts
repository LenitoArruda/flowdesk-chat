import { SupportAssistant } from "../../src/assistant/SupportAssistant.ts";
import type { AssistantDependencies } from "../../src/assistant/SupportAssistant.ts";
import { DOCUMENTS_DIR } from "../../src/config/paths.ts";
import { ingestDocuments } from "../../src/knowledge/ingest.ts";
import { loadDocuments } from "../../src/knowledge/loadDocuments.ts";
import { Retriever } from "../../src/knowledge/Retriever.ts";
import { MemoryRepository } from "../../src/repositories/memoryRepository.ts";
import { MessageRepository } from "../../src/repositories/messageRepository.ts";
import { VectorRepository } from "../../src/repositories/vectorRepository.ts";
import { FakeLlm } from "./fakes.ts";

type Handlers = ConstructorParameters<typeof FakeLlm>[0];

/** Stand-in for the scope classifier: decides from keywords, like a well-behaved model would. */
export const keywordScopeClassifier: NonNullable<Handlers>["scope"] = messages => {
    const text = (messages.at(-1)?.content ?? "").toLowerCase();
    const label = /futebol|bolo|receita de|capital da|horóscopo|poema/.test(text)
        ? "out_of_scope"
        : /esquecer quem você é|outro assistente/.test(text)
          ? "injection"
          : /como (eu )?configuro isso/.test(text)
            ? "ambiguous"
            : /^somos [^?]*$/.test(text.split("\n").at(-1) ?? "")
              ? "statement"
              : "in_scope";

    return JSON.stringify({ label, reason: "fake" });
};

/** Quotes the first documentation chunk and cites it, so the test can tell the context reached the model. */
export const quotingAnswer: NonNullable<Handlers>["answer"] = messages => {
    const system = messages[0].content;
    const firstChunk = /\[1\] \(fonte: [^)]+\)\n[^\n]+\n([^\n]+)/.exec(system);

    return `Segundo a documentação: ${firstChunk?.[1] ?? "sem trecho"} [1]`;
};

export async function createTestAssistant(handlers: Handlers = {}, overrides: Partial<AssistantDependencies> = {}) {
    const llm = new FakeLlm({ scope: keywordScopeClassifier, answer: quotingAnswer, facts: () => '{"facts":[]}', summary: () => "resumo", ...handlers });
    const vectorRepository = new VectorRepository(":memory:");
    await ingestDocuments(loadDocuments(DOCUMENTS_DIR), vectorRepository, llm);

    const messageRepository = new MessageRepository(":memory:");
    const memoryRepository = new MemoryRepository(":memory:");
    const assistant = new SupportAssistant({
        llm,
        retriever: new Retriever(llm, vectorRepository, { topK: 4, minScore: 0.2 }),
        messageRepository,
        memoryRepository,
        ...overrides,
    });

    return { assistant, llm, messageRepository, memoryRepository };
}

export const turn = (text: string, ids: { userId?: string; sessionId?: string } = {}) => ({
    userId: ids.userId ?? "ana",
    sessionId: ids.sessionId ?? "s1",
    text,
});
