import { VectorRepository } from "./vectorRepository.ts";
import { ragAnswer } from "./utils/ragAnswer.ts";

const vectorRepository = new VectorRepository();

console.log(await ragAnswer("Eu tenho direito a ferias?", vectorRepository));
