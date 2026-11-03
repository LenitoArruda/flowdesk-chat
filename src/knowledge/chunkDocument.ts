import type { KnowledgeChunk, KnowledgeDocument } from "./types.ts";

type ChunkOptions = {
    maxChars?: number;
    overlap?: number;
};

function splitWithOverlap(text: string, size: number, overlap: number): string[] {
    if (text.length <= size) return [text];

    const parts: string[] = [];
    for (let start = 0; start < text.length; start += size - overlap) {
        parts.push(text.slice(start, start + size));
        if (start + size >= text.length) break;
    }
    return parts;
}

/**
 * Splits a document by `##` section so each chunk covers one topic. Sections longer than
 * `maxChars` are split with overlap. Every chunk starts with "Title — Section" so the
 * embedding carries the topic even when the body text is generic.
 */
export function chunkDocument(
    document: KnowledgeDocument,
    { maxChars = 900, overlap = 120 }: ChunkOptions = {}
): KnowledgeChunk[] {
    const sections = document.body
        .split(/^## /m)
        .map((part, index) => {
            if (index === 0) {
                return { section: "Introdução", content: part.trim() };
            }
            const [heading, ...rest] = part.split("\n");
            return { section: heading.trim(), content: rest.join("\n").trim() };
        })
        .filter(section => section.content.length > 0);

    return sections.flatMap(({ section, content }) =>
        splitWithOverlap(content, maxChars, overlap).map(text => ({
            source: document.source,
            title: document.title,
            section,
            text: `${document.title} — ${section}\n${text}`,
        }))
    );
}
