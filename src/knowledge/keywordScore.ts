import { keywords, normalize } from "../shared/text.ts";

/** Fraction of the query's meaningful terms that appear in the chunk (accent-insensitive). */
export function keywordScore(query: string, chunk: string): number {
    const terms = keywords(query);

    if (terms.length === 0) return 0;

    const text = normalize(chunk);
    const hits = terms.filter(term => text.includes(term));

    return hits.length / terms.length;
}
