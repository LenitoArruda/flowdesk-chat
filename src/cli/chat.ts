import { randomUUID } from "node:crypto";
import * as readline from "node:readline/promises";
import { parseArgs } from "node:util";
import { createAssistant } from "../assistant/createAssistant.ts";
import { printTurn } from "./printTurn.ts";

const { values } = parseArgs({
    options: {
        user: { type: "string", default: "demo-user" },
        session: { type: "string" },
        debug: { type: "boolean", default: false },
    },
});

const userId = values.user;
const sessionId = values.session ?? randomUUID();

const { assistant, ingest } = await createAssistant();
if (ingest.ingested > 0) {
    console.log(`Base de conhecimento atualizada: ${ingest.ingested} documento(s), ${ingest.chunks} chunks.`);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log(`Assistente de suporte FlowDesk (usuário: ${userId}, sessão: ${sessionId}). Digite 'sair' para encerrar.\n`);

while (true) {
    const text = await rl.question("Você: ");

    if (text.trim().toLowerCase() === "sair") break;

    const result = await assistant.handleTurn({ userId, sessionId, text });
    printTurn(result, values.debug);
}

console.log(`\nPara retomar esta conversa: npm run chat -- --user ${userId} --session ${sessionId}`);
rl.close();
