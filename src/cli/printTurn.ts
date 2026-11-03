import type { TurnResult } from "../assistant/SupportAssistant.ts";

/** Prints an answer with its sources and, in debug mode, the full rule/decision trace. */
export function printTurn(result: TurnResult, debug: boolean): void {
    console.log(`\nAssistente: ${result.answer}`);

    if (result.sources.length > 0) {
        console.log("\nFontes:");
        for (const source of result.sources) {
            console.log(`  [${source.index}] ${source.title} › ${source.section} (${source.source})`);
        }
    }

    if (debug) {
        console.log(`\nDecisão: ${result.outcome}${result.refusalReason ? ` (${result.refusalReason})` : ""}`);
        for (const entry of result.trace) {
            const mark = entry.outcome === "block" ? "✗" : entry.outcome === "pass" ? "✓" : "·";
            console.log(`  ${mark} ${entry.stage.padEnd(10)} ${entry.rule}${entry.detail ? ` — ${entry.detail}` : ""}`);
        }
        if (result.context) {
            console.log(`  contexto: ${result.context.blocks.map(block => `${block.id}=${block.tokens}`).join(" ")}`);
        }
    }

    console.log("");
}
