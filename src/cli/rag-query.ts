import { VectorRepository } from "../repositories/vectorRepository.ts";
import { ragAnswer } from "../rag/ragAnswer.ts";
import { ragDebug } from "../rag/ragDebug.ts";
import { safeRagAnswer } from "../rag/safeRagAnswer.ts";

const vectorRepository = new VectorRepository();

const question = "Quando eu fui contratado?";

await ragDebug(question, vectorRepository);

console.log("\n--------- Resposta ---------\n");
console.log(await safeRagAnswer(question, vectorRepository, ["senha"]));
