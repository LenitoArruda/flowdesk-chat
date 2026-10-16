import { openai } from "../clients/openai.ts";
import type { Message } from "./types.ts";


export async function summarizeHistory(messages: Message[]): Promise<string> {
    const systemPrompt = `Você é um assistente que resume o histórico de mensagens. 
    Analise as mensagens e forneça um resumo conciso, detalhando os pontos principais. 
    Mantenha o resumo claro e objetivo.
    Limete o resumo a um único parágrafo.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            ...messages
        ]
    });

    const summary = response.choices[0].message.content ?? "";
    return summary;
}