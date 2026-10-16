import type { ValidationResult } from "./types.ts";

export function validateInput(input: string, blocked: string[], maxLength = 1000): ValidationResult {

    const errors: string[] = [];

    if (!input || input.trim() === "") {
        errors.push("Input cannot be empty");
    }

    if (blocked.some(word => input.includes(word))) {
        errors.push("Input contains blocked words");
    }

    if (input.length > maxLength) {
        errors.push(`Input exceeds maximum length of ${maxLength} characters`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}