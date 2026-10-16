import type { Message } from "./types";

export function stitchContext(
    params: {
        summary?: string;
        userProfile?: string;
        recentMessages: Message[];
    }
) {
    const stiched: Message[] = [];

    if (params.summary) {
        stiched.push({ role: "user", content: `Resumo da conversa até agora: ${params.summary}` });
        stiched.push({ role: "assistant", content: "Entendido, continuaremos a partir desse ponto." });
    }

    if (params.userProfile) {
        stiched.push({ role: "user", content: `Perfil do usuário: ${params.userProfile}` });
        stiched.push({ role: "assistant", content: "Entendido." });
    }

    stiched.push(...params.recentMessages);

    return [
        ...stiched,
        ...params.recentMessages
    ];
};