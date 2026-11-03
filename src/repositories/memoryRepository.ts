import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { DB_DIR, MEMORY_DB_PATH } from "../config/paths.ts";

export type SessionSummary = {
    summary: string;
    /** How many messages of the session (from the start) the summary already covers. */
    coveredMessages: number;
};

export type UserFact = {
    key: string;
    value: string;
};

export class MemoryRepository {
    private db: DatabaseSync;

    /** Pass ":memory:" for an isolated, throwaway database (used by tests). */
    constructor(path: string = MEMORY_DB_PATH) {
        if (path !== ":memory:") mkdirSync(DB_DIR, { recursive: true });

        this.db = new DatabaseSync(path);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS session_summaries (
                session_id TEXT PRIMARY KEY,
                summary TEXT NOT NULL,
                covered_messages INTEGER NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS user_facts (
                user_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, key)
            );
        `);
    }

    getSummary(sessionId: string): SessionSummary | undefined {
        const row = this.db
            .prepare(`SELECT summary, covered_messages FROM session_summaries WHERE session_id = ?`)
            .get(sessionId) as { summary: string; covered_messages: number } | undefined;

        return row && { summary: row.summary, coveredMessages: row.covered_messages };
    }

    saveSummary(sessionId: string, { summary, coveredMessages }: SessionSummary): void {
        this.db.prepare(`
            INSERT INTO session_summaries (session_id, summary, covered_messages)
            VALUES (?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                summary = excluded.summary,
                covered_messages = excluded.covered_messages,
                updated_at = CURRENT_TIMESTAMP
        `).run(sessionId, summary, coveredMessages);
    }

    getFacts(userId: string): UserFact[] {
        const rows = this.db
            .prepare(`SELECT key, value FROM user_facts WHERE user_id = ? ORDER BY key`)
            .all(userId) as UserFact[];

        return rows.map(row => ({ key: row.key, value: row.value }));
    }

    upsertFact(userId: string, fact: UserFact): void {
        this.db.prepare(`
            INSERT INTO user_facts (user_id, key, value)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP
        `).run(userId, fact.key, fact.value);
    }
}
