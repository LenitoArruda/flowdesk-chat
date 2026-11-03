import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { KnowledgeDocument } from "./types.ts";

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n?/;

/** Parses a Markdown file with an optional `key: value` front-matter block. */
export function parseDocument(source: string, raw: string): KnowledgeDocument {
    const text = raw.replace(/\r\n/g, "\n");
    const match = FRONT_MATTER.exec(text);
    const meta: Record<string, string> = {};

    if (match) {
        for (const line of match[1].split("\n")) {
            const separator = line.indexOf(":");
            if (separator > 0) {
                meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
            }
        }
    }

    return {
        source,
        title: meta.title ?? source.replace(/\.md$/, ""),
        category: meta.category ?? "geral",
        body: (match ? text.slice(match[0].length) : text).trim(),
    };
}

export function loadDocuments(directory: string): KnowledgeDocument[] {
    return readdirSync(directory)
        .filter(file => file.endsWith(".md"))
        .sort()
        .map(file => parseDocument(file, readFileSync(resolve(directory, file), "utf-8")));
}
