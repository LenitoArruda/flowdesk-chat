import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DOCUMENTS_DIR } from "../../src/config/paths.ts";
import { chunkDocument } from "../../src/knowledge/chunkDocument.ts";
import { ingestDocuments } from "../../src/knowledge/ingest.ts";
import { loadDocuments, parseDocument } from "../../src/knowledge/loadDocuments.ts";
import { Retriever } from "../../src/knowledge/Retriever.ts";
import { VectorRepository } from "../../src/repositories/vectorRepository.ts";
import { FakeLlm } from "../helpers/fakes.ts";

describe("parseDocument", () => {
    it("reads front-matter and body", () => {
        const doc = parseDocument("a.md", "---\ntitle: Título\ncategory: x\n---\nCorpo");
        assert.equal(doc.title, "Título");
        assert.equal(doc.category, "x");
        assert.equal(doc.body, "Corpo");
    });

    it("falls back to the file name without front-matter", () => {
        const doc = parseDocument("sem-meta.md", "Só texto");
        assert.equal(doc.title, "sem-meta");
        assert.equal(doc.body, "Só texto");
    });
});

describe("chunkDocument", () => {
    const doc = parseDocument("a.md", "---\ntitle: Guia\n---\nIntro aqui.\n\n## Primeira\nTexto um.\n\n## Segunda\nTexto dois.");

    it("creates one chunk per section, prefixed with title and section", () => {
        const chunks = chunkDocument(doc);
        assert.deepEqual(chunks.map(c => c.section), ["Introdução", "Primeira", "Segunda"]);
        assert.match(chunks[1].text, /^Guia — Primeira\nTexto um\./);
        assert.ok(chunks.every(c => c.source === "a.md"));
    });

    it("splits long sections with overlap", () => {
        const long = parseDocument("b.md", `## Longa\n${"palavra ".repeat(300)}`);
        const chunks = chunkDocument(long, { maxChars: 500, overlap: 50 });
        assert.ok(chunks.length > 1);
        assert.ok(chunks.every(c => c.text.length <= 500 + "b — Longa\n".length + 20));
    });
});

describe("knowledge base", () => {
    const documents = loadDocuments(DOCUMENTS_DIR);

    it("has the support articles with metadata", () => {
        assert.ok(documents.length >= 12);
        assert.ok(documents.every(d => d.title && d.category && d.body.length > 200));
    });

    it("ingests idempotently and re-ingests only changed documents", async () => {
        const llm = new FakeLlm();
        const repo = new VectorRepository(":memory:");

        const first = await ingestDocuments(documents, repo, llm);
        const total = repo.count();
        assert.equal(first.ingested, documents.length);
        assert.equal(first.skipped, 0);
        assert.equal(total, first.chunks);

        const second = await ingestDocuments(documents, repo, llm);
        assert.equal(second.ingested, 0);
        assert.equal(second.skipped, documents.length);
        assert.equal(repo.count(), total);

        const changed = [{ ...documents[0], body: `${documents[0].body}\n\n## Novo\nConteúdo novo.` }, ...documents.slice(1)];
        const third = await ingestDocuments(changed, repo, llm);
        assert.equal(third.ingested, 1);
        assert.equal(third.skipped, documents.length - 1);
        assert.equal(repo.count(), total + 1);
    });

    it("retrieves the right article for platform questions and nothing for unrelated ones", async () => {
        const llm = new FakeLlm();
        const repo = new VectorRepository(":memory:");
        await ingestDocuments(documents, repo, llm);
        const retriever = new Retriever(llm, repo, { topK: 4, minScore: 0.2 });

        const cases: [string, string][] = [
            ["Como inicio uma sprint e qual a duração padrão?", "boards-sprints-e-backlog.md"],
            ["Quanto custa o plano Business por usuário?", "planos-e-cobranca.md"],
            ["O convite por e-mail não chegou, o que faço?", "problemas-comuns.md"],
            ["Como conectar o GitHub e vincular commits às issues?", "integracoes.md"],
        ];

        for (const [question, expected] of cases) {
            const results = await retriever.retrieve(question);
            assert.ok(results.some(r => r.source === expected), `"${question}" should retrieve ${expected}, got ${results.map(r => r.source)}`);
        }

        const unrelated = await retriever.retrieve("Qual a melhor receita de bolo de chocolate?");
        assert.deepEqual(unrelated, []);
    });
});
