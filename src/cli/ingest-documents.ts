import { VectorRepository } from "../repositories/vectorRepository.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DOCUMENTS_DIR } from "../config/paths.ts";
import { ingest } from "../rag/ingest.ts";

const vectorRepository = new VectorRepository();

const source1 = resolve(DOCUMENTS_DIR, "politicas-de-ferias.txt");
const source2 = resolve(DOCUMENTS_DIR, "politicas-de-final-de-ano.txt");

const co1doc1 = readFileSync(source1, "utf-8");
const co1doc2 = readFileSync(source2, "utf-8");

await ingest(source1, co1doc1, vectorRepository);
await ingest(source2, co1doc2, vectorRepository);