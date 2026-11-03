import type { RetrievedChunk } from "../knowledge/types.ts";
import { normalize } from "../shared/text.ts";
import { ALLOWED, block } from "./types.ts";
import type { RuleResult } from "./types.ts";

type OutputCheck = {
    answer: string;
    chunks: RetrievedChunk[];
    question: string;
    /** Extra text the answer may legitimately repeat (e.g. user profile facts). */
    allowedText?: string[];
};

/** The model saying it does not know is the desired behaviour, so it needs no citation. */
const HONEST_UNKNOWN = /\b(nao encontrei|nao consta|nao ha informac\w+|nao tenho informac\w+|nao foi possivel encontrar)\b/;

const PROMPT_LEAK = /(\[regras\]|\[documentacao\]|\[perfil do usuario\]|system prompt|minhas instrucoes (sao|dizem))/;

const PROMISES = /\b(vou (abrir|criar|escalar|alterar|cancelar|excluir|resolver|reembolsar)|ja (abri|cancelei|alterei|resolvi|reembolsei)|eu garanto|garanto que|prometo)\b/;

function numbersIn(text: string): string[] {
    return text.match(/\d+(?:[.,]\d+)*/g) ?? [];
}

/**
 * Deterministic post-generation checks. The point is that an answer reaches the user only
 * if it can be traced back to the retrieved documentation:
 * 1. it cites existing sources (or honestly says it did not find the information);
 * 2. it does not leak the prompt or promise actions the assistant cannot perform;
 * 3. every number it states (limits, prices, days) appears in the context.
 */
export function checkOutput({ answer, chunks, question, allowedText = [] }: OutputCheck): RuleResult {
    if (answer.trim() === "") {
        return block("ungrounded_output", "output.not_empty");
    }

    const normalized = normalize(answer);

    if (PROMPT_LEAK.test(normalized)) {
        return block("ungrounded_output", "output.no_prompt_leak");
    }

    if (PROMISES.test(normalized)) {
        return block("ungrounded_output", "output.no_promises");
    }

    const citations = [...answer.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1]));
    const admitsNotFinding = HONEST_UNKNOWN.test(normalized);

    if (citations.length === 0 && !admitsNotFinding) {
        return block("ungrounded_output", "output.requires_citation");
    }

    const invalid = citations.find(citation => citation < 1 || citation > chunks.length);
    if (invalid !== undefined) {
        return block("ungrounded_output", "output.valid_citation", `[${invalid}] não existe`);
    }

    const context = [...chunks.map(chunk => chunk.text), question, ...allowedText].join("\n");
    const known = new Set(numbersIn(context));
    const withoutMarkers = answer.replace(/\[\d+\]/g, " ").replace(/^\s*\d+[.)]\s+/gm, "");
    const unknown = numbersIn(withoutMarkers).find(token => token.replace(/\D/g, "").length >= 2 && !known.has(token));

    if (unknown !== undefined) {
        return block("ungrounded_output", "output.grounded_numbers", `"${unknown}" não aparece na documentação`);
    }

    return ALLOWED;
}
