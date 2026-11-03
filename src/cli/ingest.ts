import { DOCUMENTS_DIR } from "../config/paths.ts";
import { ingestDocuments } from "../knowledge/ingest.ts";
import { loadDocuments } from "../knowledge/loadDocuments.ts";
import { OpenAiClient } from "../llm/OpenAiClient.ts";
import { VectorRepository } from "../repositories/vectorRepository.ts";

const repo = new VectorRepository();
const report = await ingestDocuments(loadDocuments(DOCUMENTS_DIR), repo, new OpenAiClient());

console.log(
    `${report.documents} documentos: ${report.ingested} ingeridos (${report.chunks} chunks), ${report.skipped} sem alterações. Total na base: ${repo.count()} chunks.`
);
