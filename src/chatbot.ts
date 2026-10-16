import * as readLine from "node:readline/promises";
import { streamResponse } from "./utils/streamResponse.ts";
import { MessageRepository } from "./utils/messageRepository.ts";
import * as crypto from "node:crypto";
import { ContextWindow } from "./utils/contextWindows.ts";
import { maybeCompress } from "./utils/maybeCompress.ts";
import { stitchContext } from "./utils/stitchContext.ts";
import { validateInput } from "./utils/validateInput.ts";
import { validateOutput } from "./utils/validateOutput.ts";

const systemPrompt = process.argv[2];
const windowId = process.argv[3] || crypto.randomUUID();

const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
});

const contextWindow = new ContextWindow();
const messageRepository = new MessageRepository();

const initialMessages = messageRepository.load(windowId);
initialMessages.forEach(message => contextWindow.restore(message.role, message.content));

while (true) {
    const usePrompt = await rl.question("Você (Digite sua pergunta ou 'sair' para encerrar): ");

    if (usePrompt.toLowerCase() === "sair") {
        console.log("Encerrando o chatbot...");
        break;
    };

    const inputValidationResult = validateInput(usePrompt, ["senha", "pix", "futebol"]);

    if (!inputValidationResult.isValid) {
        console.log("Entrada inválida:", inputValidationResult.errors.join(", "));
        continue;
    };

    messageRepository.save(windowId, contextWindow.addUserMessage(usePrompt));

    const compressedMessages = await maybeCompress(contextWindow);
    const stitched = stitchContext({
        recentMessages: compressedMessages
    });

    process.stdout.write("Assistente: Estou gerando a resposta...\n\n");

    const fullResponse = await streamResponse(stitched, systemPrompt);

    const outputValidationResult = validateOutput(fullResponse, ["eu acho que você deveria fazer", "você deve fazer", "o meu conselho para você é"]);

    if (!outputValidationResult.isValid) {
        console.log("Saída inválida:", outputValidationResult.errors.join(", "));
        continue;
    };

    messageRepository.save(windowId, contextWindow.addAssistantMessage(fullResponse));
}

console.log("para resumir a sessão utilize o ID da janela: " + windowId);
rl.close();