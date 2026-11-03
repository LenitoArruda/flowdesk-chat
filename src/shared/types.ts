
export type Message = {
    role: "user" | "assistant" | "system";
    content: string;
};


export type ValidationResult = {
    isValid: boolean;
    errors: string[];
};

export type RagExample = {
    q: string;
    a: string;
};