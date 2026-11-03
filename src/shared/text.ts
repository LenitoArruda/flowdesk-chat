/** Lowercases and strips accents so "Permissão" and "permissao" compare equal. */
export function normalize(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
}

const STOPWORDS = new Set([
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
    "por", "para", "pra", "com", "sem", "sobre", "ao", "aos", "que", "e", "ou", "se", "eu", "me", "meu", "minha",
    "voce", "como", "qual", "quais", "quando", "onde", "posso", "pode", "ser", "esta", "isso", "esse", "essa",
    "mais", "muito", "ja", "nao", "sim", "tem", "ter", "fazer", "faco", "preciso", "quero",
]);

/** Normalized words without stopwords, used for keyword matching. */
export function keywords(text: string, minLength = 3): string[] {
    return normalize(text)
        .split(/[^a-z0-9]+/)
        .filter(term => term.length >= minLength && !STOPWORDS.has(term));
}

/** Rough token estimate (Portuguese averages ~3.5 characters per token). */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
}
