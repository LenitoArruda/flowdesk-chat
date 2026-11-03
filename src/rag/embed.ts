import { openai } from "../clients/openai.ts";

export async function embed(input: string) {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input,
    });
    return response.data[0].embedding;
};