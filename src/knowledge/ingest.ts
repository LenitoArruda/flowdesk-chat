import { createHash } from "node:crypto";
import type { LlmClient } from "../llm/LlmClient.ts";
import type { VectorRepository } from "../repositories/vectorRepository.ts";
import { chunkDocument } from "./chunkDocument.ts";
import type { IngestReport, KnowledgeDocument } from "./types.ts";

function hashDocument(document: KnowledgeDocument): string {
    return createHash("sha256")
        .update(`${document.title}\n${document.category}\n${document.body}`)
        .digest("hex");
}

/**
 * Idempotent: a document whose content hash is already stored is skipped, and a changed
 * document replaces all of its previous chunks instead of adding duplicates.
 */
export async function ingestDocuments(
    documents: KnowledgeDocument[],
    repo: VectorRepository,
    llm: LlmClient
): Promise<IngestReport> {
    const report: IngestReport = { documents: documents.length, ingested: 0, skipped: 0, chunks: 0 };

    for (const document of documents) {
        const hash = hashDocument(document);

        if (repo.getContentHash(document.source) === hash) {
            report.skipped++;
            continue;
        }

        const chunks = chunkDocument(document);
        const embeddings = await Promise.all(chunks.map(chunk => llm.embed(chunk.text)));

        repo.deleteBySource(document.source);
        chunks.forEach((chunk, index) => repo.insert(chunk, embeddings[index], hash));

        report.ingested++;
        report.chunks += chunks.length;
    }

    return report;
}
