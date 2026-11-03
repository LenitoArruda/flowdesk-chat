import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { DB_DIR, MESSAGES_DB_PATH } from "../config/paths.ts";
import type { Message } from "../shared/types.ts";

export class MessageRepository {
    private db: DatabaseSync;

    /** Pass ":memory:" for an isolated, throwaway database (used by tests). */
    constructor(path: string = MESSAGES_DB_PATH) {
        if (path !== ":memory:") mkdirSync(DB_DIR, { recursive: true });

        this.db = new DatabaseSync(path);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                context_window TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    save(sessionId: string, message: Message): void {
        this.db.prepare(`
            INSERT INTO messages (context_window, role, content)
            VALUES (?, ?, ?)
        `).run(sessionId, message.role, message.content);
    }

    /** Full history of a session in insertion order. */
    load(sessionId: string): Message[] {
        const rows = this.db.prepare(`
            SELECT role, content
            FROM messages
            WHERE context_window = ?
            ORDER BY id ASC
        `).all(sessionId) as Message[];

        return rows.map(row => ({ role: row.role, content: row.content }));
    }
}
