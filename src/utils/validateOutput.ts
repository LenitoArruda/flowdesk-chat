import type { ValidationResult } from "./types.ts";

export function validateOutput(response: string, hallucinationSignals: string[]): ValidationResult {

    const errors: string[] = [];

    if (hallucinationSignals.some(signal => response.includes(signal))) {
        errors.push("Response contains hallucination signals");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}