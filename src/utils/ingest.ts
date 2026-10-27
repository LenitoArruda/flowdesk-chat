import { VectorRepository } from "../vectorRepository.ts";
import { chunkText } from "./chunkText.ts";
import { embed } from "./embed.ts";

export async function ingest(
    source: string,
    text: string,
    repo: VectorRepository
) {
    const chunks = chunkText(text);
    for (const chunk of chunks) {
        const embeddings = await embed(chunk);
        repo.insert(source, chunk, embeddings);
    }

    console.log(`${chunks.length} chunks ingestados de ${source}`)
};