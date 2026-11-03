import { settings } from "../config/settings.ts";
import { containsSensitiveData } from "../shared/sensitive.ts";
import { normalize } from "../shared/text.ts";
import { ALLOWED, block } from "./types.ts";
import type { RuleResult } from "./types.ts";

/** Patterns run on accent-stripped, lowercased text. */
const INJECTION_PATTERNS: RegExp[] = [
    /\b(ignore|ignora|ignorar|desconsidere|desconsiderar|esqueca|esquecer|abandone)\b.{0,30}\b(instrucoes|regras|ordens|orientacoes|diretrizes|prompt)\b/,
    /\b(revele|mostre|exiba|repita|imprima|vaze|diga)\b.{0,30}\b(suas|seu|sua)\s+(instrucoes|regras|prompt|configuracao|diretrizes)\b/,
    /\b(system\s*prompt|prompt\s+do\s+sistema|prompt\s+de\s+sistema|instrucoes\s+do\s+sistema)\b/,
    /\b(voce\s+agora\s+e|a\s+partir\s+de\s+agora\s+voce|finja\s+(ser|que)|aja\s+como|atue\s+como|assuma\s+o\s+papel)\b/,
    /\b(modo\s+(desenvolvedor|developer|deus|admin)|jailbreak|do\s+anything\s+now)\b/,
    /\b(ignore\s+(all|previous|the)|disregard\s+(all|previous)|you\s+are\s+now|pretend\s+to\s+be)\b/,
];

/** Cheap, deterministic checks that run before any model call. */
export function checkInput(text: string, maxLength: number = settings.input.maxLength): RuleResult {
    if (text.trim() === "") {
        return block("empty", "input.not_empty");
    }

    if (text.length > maxLength) {
        return block("too_long", "input.max_length", `${text.length} > ${maxLength}`);
    }

    if (containsSensitiveData(text)) {
        return block("sensitive_data", "input.no_sensitive_data");
    }

    const normalized = normalize(text);
    const pattern = INJECTION_PATTERNS.find(candidate => candidate.test(normalized));
    if (pattern) {
        return block("prompt_injection", "input.no_prompt_injection", pattern.source.slice(0, 60));
    }

    return ALLOWED;
}
