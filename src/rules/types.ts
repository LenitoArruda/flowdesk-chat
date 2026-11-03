export type RefusalReason =
    | "empty"
    | "too_long"
    | "prompt_injection"
    | "sensitive_data"
    | "out_of_scope"
    | "no_knowledge"
    | "ungrounded_output";

export type RuleResult =
    | { allowed: true }
    | { allowed: false; reason: RefusalReason; rule: string; detail?: string };

export const ALLOWED: RuleResult = { allowed: true };

export function block(reason: RefusalReason, rule: string, detail?: string): RuleResult {
    return { allowed: false, reason, rule, detail };
}

/** One line of the per-turn audit trail: which stage ran, which rule decided, and why. */
export type TraceEntry = {
    stage: "input" | "scope" | "memory" | "retrieval" | "context" | "generation" | "output";
    rule: string;
    outcome: "pass" | "block" | "info";
    detail?: string;
};
