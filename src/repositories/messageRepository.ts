import { DatabaseSync } from "node:sqlite"
import { mkdirSync } from "node:fs";
import { DB_DIR, MESSAGES_DB_PATH } from "../config/paths.ts";
import type { Message } from "../shared/types.ts";

export class MessageRepository {
    private db: DatabaseSync;

    constructor() {
        mkdirSync(DB_DIR, { recursive: true });
        this.db = new DatabaseSync(MESSAGES_DB_PATH);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                context_window TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    };

    save(windowId: string, data: Message): void {
        this.db.prepare(`
            INSERT INTO messages (context_window, role, content)
            VALUES (?, ?, ?)
        `).run(windowId, data.role, data.content);
    };

    load(session: string): Message[] {
        const messages: Message[] = [];

        const rows = this.db.prepare(`
            SELECT role, content
            FROM messages
            WHERE context_window = ?
            ORDER BY created_at ASC
        `).all(session);

        return rows.map(row => ({
            role: row.role,
            content: row.content
        }) as Message);
    }
}