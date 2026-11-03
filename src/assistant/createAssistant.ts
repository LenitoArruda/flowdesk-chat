import { DOCUMENTS_DIR } from "../config/paths.ts";
import { ingestDocuments } from "../knowledge/ingest.ts";
import { loadDocuments } from "../knowledge/loadDocuments.ts";
import { Retriever } from "../knowledge/Retriever.ts";
import type { IngestReport } from "../knowledge/types.ts";
import { OpenAiClient } from "../llm/OpenAiClient.ts";
import { MemoryRepository } from "../repositories/memoryRepository.ts";
import { MessageRepository } from "../repositories/messageRepository.ts";
import { VectorRepository } from "../repositories/vectorRepository.ts";
import { SupportAssistant } from "./SupportAssistant.ts";

/** Composition root: wires the real OpenAI client and the on-disk repositories. */
export async function createAssistant(): Promise<{ assistant: SupportAssistant; ingest: IngestReport }> {
    const llm = new OpenAiClient();
    const vectorRepository = new VectorRepository();

    // Idempotent: unchanged documents are skipped, so this is cheap after the first run.
    const ingest = await ingestDocuments(loadDocuments(DOCUMENTS_DIR), vectorRepository, llm);

    const assistant = new SupportAssistant({
        llm,
        retriever: new Retriever(llm, vectorRepository),
        messageRepository: new MessageRepository(),
        memoryRepository: new MemoryRepository(),
    });

    return { assistant, ingest };
}
