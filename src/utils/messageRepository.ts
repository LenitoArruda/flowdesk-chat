import { DatabaseSync } from "node:sqlite"
import type { IRepository, Message } from "./types";

export class MessageRepository implements IRepository<Message> {
    private db: DatabaseSync;

    constructor() {
        this.db = new DatabaseSync("pos_ia-m3.db");
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