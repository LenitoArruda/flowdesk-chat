import { VectorRepository } from "../vectorRepository.ts";
import { embed } from "./embed.ts";

const MAX_CHUNKS = 150;

export async function ragDebug(
    question: string,
    repo: VectorRepository
) {
    const questionEmbedding = await embed(question);
    const results = await repo.search(question, questionEmbedding);

    console.log("\n--------- Chunks recuperados ---------");
    results.forEach((result, index) => {
        console.log(`\n[${index + 1}] Score:${result.score.toFixed(2)}`);
        console.log(`${result.chunk.slice(0, MAX_CHUNKS)}${result.chunk.length > MAX_CHUNKS ? "..." : ""}`);
    });
};  