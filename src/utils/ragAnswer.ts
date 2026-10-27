import { openai } from "../clients/openai.ts";
import { VectorRepository } from "../vectorRepository.ts";
import { buildRagPrompt } from "./buildRagPrompt.ts";
import { embed } from "./embed.ts";

export async function ragAnswer(
    question: string,
    repo: VectorRepository
) {
    // 1. embeds a peregunta
    const questionEmbedding = await embed(question);

    // 2. busca os chunks relevantes no repositório
    const results = repo.search(question, questionEmbedding);
    const chunks = results.map(r => r.chunk);

    // 3. monta o prompt e chama o modelo
    const prompt = buildRagPrompt(question, chunks)

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    });

    // 4. retorna a resposta do modelo
    return response.choices[0].message.content ?? "";


};