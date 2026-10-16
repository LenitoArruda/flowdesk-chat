import { openai } from "../clients/openai.ts";
import { ContextWindow } from "./contextWindows.ts";
import { withRetry } from "./withRetry.ts";

export async function generateWithCritique<T>(
    system: string,
    contextWindow: ContextWindow,
): Promise<string> {
    console.log("Generating draft with context window:", JSON.stringify(contextWindow.getMessages(), null, 2));
    const draft = await withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: system },
                ...contextWindow.getMessages()
            ]
        });
        return response.choices[0].message.content ?? "";
    });

    const critique = await withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Identifique em 1 frase pontos de melhorias e criticas na resposta. Se estiver boa diga apenas aprovado. Se nao diga o que pode melhorar baseado na sua analise e criticas." },
                { role: "user", content: draft }
            ]
        });
        return response.choices[0].message.content;
    });

    if (critique?.toLowerCase()?.includes("aprovado")) {
        return draft;
    }

    return await withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: `Reescreva a resposta anterior considerando as criticas / melhorias recebidas. Se a critica for aprovado apenas reescreva a resposta sem alteração.` },
                { role: "user", content: `Resposta anterior:${draft}\n\nCriticas / Melhorias: ${critique}` }
            ]
        });
        return response.choices[0].message.content ?? "";
    });;
}