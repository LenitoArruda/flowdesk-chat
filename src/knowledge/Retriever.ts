import { settings } from "../config/settings.ts";
import type { LlmClient } from "../llm/LlmClient.ts";
import type { SearchOptions, VectorRepository } from "../repositories/vectorRepository.ts";
import type { RetrievedChunk } from "./types.ts";

export class Retriever {
    private llm: LlmClient;
    private repo: VectorRepository;
    private options: SearchOptions;

    constructor(llm: LlmClient, repo: VectorRepository, options: SearchOptions = settings.retrieval) {
        this.llm = llm;
        this.repo = repo;
        this.options = options;
    }

    /** Empty result means "the knowledge base has nothing relevant" — callers must not guess. */
    async retrieve(query: string): Promise<RetrievedChunk[]> {
        const embedding = await this.llm.embed(query);
        return this.repo.search(query, embedding, this.options);
    }
}
