import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { DB_DIR, VECTORS_DB_PATH } from "../config/paths.ts";
import { cosineSimilarity } from "../knowledge/cosineSimilarity.ts";
import { hybridScore } from "../knowledge/hybridScore.ts";
import { keywordScore } from "../knowledge/keywordScore.ts";
import type { KnowledgeChunk, RetrievedChunk } from "../knowledge/types.ts";

type ChunkRow = {
    source: string;
    title: string;
    section: string;
    chunk: string;
    embeddings: string;
};

export type SearchOptions = {
    topK: number;
    minScore: number;
};

export class VectorRepository {
    private db: DatabaseSync;

    /** Pass ":memory:" for an isolated, throwaway database (used by tests). */
    constructor(path: string = VECTORS_DB_PATH) {
        if (path !== ":memory:") mkdirSync(DB_DIR, { recursive: true });

        this.db = new DatabaseSync(path);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS knowledge_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                title TEXT NOT NULL,
                section TEXT NOT NULL,
                chunk TEXT NOT NULL,
                embeddings TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(source);
        `);
    }

    insert(chunk: KnowledgeChunk, embedding: number[], contentHash: string): void {
        this.db.prepare(`
            INSERT INTO knowledge_chunks (source, title, section, chunk, embeddings, content_hash)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(chunk.source, chunk.title, chunk.section, chunk.text, JSON.stringify(embedding), contentHash);
    }

    deleteBySource(source: string): void {
        this.db.prepare(`DELETE FROM knowledge_chunks WHERE source = ?`).run(source);
    }

    /** Hash of the document version currently stored for `source`, if any. */
    getContentHash(source: string): string | undefined {
        const row = this.db
            .prepare(`SELECT content_hash FROM knowledge_chunks WHERE source = ? LIMIT 1`)
            .get(source) as { content_hash: string } | undefined;

        return row?.content_hash;
    }

    count(): number {
        const row = this.db.prepare(`SELECT COUNT(*) AS total FROM knowledge_chunks`).get() as { total: number };
        return row.total;
    }

    /**
     * Brute-force hybrid search. Fine for a few thousand chunks; swap for an ANN index
     * (sqlite-vec, pgvector) if the knowledge base grows beyond that.
     */
    search(query: string, queryEmbedding: number[], { topK, minScore }: SearchOptions): RetrievedChunk[] {
        const rows = this.db
            .prepare(`SELECT source, title, section, chunk, embeddings FROM knowledge_chunks`)
            .all() as ChunkRow[];

        return rows
            .map(row => ({
                source: row.source,
                title: row.title,
                section: row.section,
                text: row.chunk,
                score: hybridScore(
                    cosineSimilarity(queryEmbedding, JSON.parse(row.embeddings)),
                    keywordScore(query, row.chunk)
                ),
            }))
            .filter(chunk => chunk.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
}
