import { VectorRepository } from "./vectorRepository.ts";
import { ragAnswer } from "./utils/ragAnswer.ts";
import { ragDebug } from "./utils/ragDebug.ts";
import { safeRagAnswer } from "./utils/safeRagAnswer.ts";

const vectorRepository = new VectorRepository();

const question = "Quando eu fui contratado?";

await ragDebug(question, vectorRepository);

console.log("\n--------- Resposta ---------\n");
console.log(await safeRagAnswer(question, vectorRepository, ["senha"]));
