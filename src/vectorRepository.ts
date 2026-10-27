import { DatabaseSync } from "node:sqlite"
import { cosineSimilarity } from "./utils/cosineSimilarity.ts";

export class VectorRepository {
    embed(question: string) {
        throw new Error("Method not implemented.");
    }
    private db: DatabaseSync;

    constructor(db = "vector_db.db") {
        this.db = new DatabaseSync(db);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                chunk TEXT NOT NULL,
                embeddings TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    };


    insert(source: string, chunk: string, embeddings: number[]) {
        this.db.prepare(`
            INSERT INTO documents (source, chunk, embeddings)
            VALUES (?, ?, ?)
        `).run(source, chunk, JSON.stringify(embeddings));
    }

    search(inputEmbedding: number[], topK = 5) {
        const documents = this.db
            .prepare(`SELECT chunk, embeddings FROM documents`)
            .all() as { chunk: string, embeddings: string }[];

        return documents.map(row => ({
            chunk: row.chunk,
            score: cosineSimilarity(inputEmbedding, JSON.parse(row.embeddings)),
        }))
            .sort((d1, d2) => d2.score - d1.score)
            .slice(0, topK);
    }
}