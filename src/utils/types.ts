
export type Message = {
    role: "user" | "assistant" | "system";
    content: string;
};

export interface IRepository<T> {
    save(session: string, data: T): void;
    load(session: string): T[];
};

export type ValidationResult = {
    isValid: boolean;
    errors: string[];
};