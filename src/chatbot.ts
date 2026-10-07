import * as readLine from "node:readline/promises";
import { streamResponse } from "./utils/streamResponse.ts";
import type { History } from "./utils/types.ts";

const systemPrompt = process.argv[2];

const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
});

const history: History[] = [];

while (true) {
    const usePrompt = await rl.question("Você (Digite sua pergunta ou 'sair' para encerrar): ");

    if (usePrompt.toLowerCase() === "sair") {
        console.log("Encerrando o chatbot...");
        break;
    };

    history.push({ role: "user", content: usePrompt });

    process.stdout.write("Assistente: Estou gerando a resposta...\n\n");

    const fullResponse = await streamResponse(history, systemPrompt);

    history.push({ role: "assistant", content: fullResponse });
}

rl.close();