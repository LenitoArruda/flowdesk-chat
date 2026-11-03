import { normalize } from "./text.ts";

const SENSITIVE_PATTERNS: RegExp[] = [
    /\b(?:\d[ -]?){13,16}\b/,                                       // card number
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,                              // CPF
    /\b(minha|nossa|a)\s+senha\s+(e|eh|:)/,                          // "minha senha é ..."
    /\b(senha|password|token|api[ _-]?key|secret)\s*[:=]\s*\S+/,     // key=value credentials
    /\bsk-[a-z0-9]{16,}/,                                            // OpenAI-style keys
];

export function containsSensitiveData(text: string): boolean {
    const normalized = normalize(text);
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(normalized));
}
