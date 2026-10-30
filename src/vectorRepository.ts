import { DatabaseSync } from "node:sqlite"
import { cosineSimilarity } from "./utils/cosineSimilarity.ts";
import { hybridScore } from "./utils/hybridScore.ts";
import { keywordScore } from "./utils/keywordScore.ts";

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

    search(input: string, inputEmbedding: number[], topK = 5, minScore = 0.6) {
        const documents = this.db
            .prepare(`SELECT chunk, embeddings FROM documents`)
            .all() as { chunk: string, embeddings: string }[];

        return documents.map(document => ({
            chunk: document.chunk,
            score: hybridScore(
                cosineSimilarity(inputEmbedding, JSON.parse(document.embeddings)),
                keywordScore(input, document.chunk)
            ),
        }))
            .filter(doc => doc.score >= minScore)
            .sort((d1, d2) => d2.score - d1.score)
            .slice(0, topK);
    }
}