import { settings } from "../config/settings.ts";
import { keywordScore } from "../knowledge/keywordScore.ts";
import type { LlmClient } from "../llm/LlmClient.ts";
import type { MemoryRepository, UserFact } from "../repositories/memoryRepository.ts";
import { containsSensitiveData } from "../shared/sensitive.ts";
import { normalize } from "../shared/text.ts";

const FACT_KEYS = ["plano", "papel", "equipe", "ferramentas", "projeto"] as const;
/** Always useful for support answers (limits and permissions depend on them). */
const CORE_KEYS = new Set<string>(["plano", "papel"]);

const EXTRACTION_PROMPT = `Extraia fatos DURÁVEIS sobre o usuário e a organização dele que ajudem a personalizar o suporte da FlowDesk no futuro.
Chaves permitidas: ${FACT_KEYS.join(", ")}.
- plano: plano contratado (Free, Standard, Business ou Enterprise)
- papel: papel do usuário (administrador da organização, administrador do projeto, membro, visualizador, convidado)
- equipe: tamanho ou tipo da equipe
- ferramentas: ferramentas integradas ou usadas junto com a FlowDesk
- projeto: modelo de projeto usado (Kanban ou Scrum)
Ignore dúvidas pontuais, emoções, suposições e qualquer dado sensível (senhas, tokens, cartões, documentos).
Responda somente JSON: {"facts":[{"key":"plano","value":"Business"}]}. Se não houver fatos, responda {"facts":[]}.`;

/** Cheap pre-filter: only call the model when the user talks about themselves or their team. */
const SELF_REFERENCE =
    /\b(eu|nos|nosso|nossa|nossos|nossas|minha|meu|minhas|meus|usamos|uso|sou|somos|temos|tenho|trabalho|trabalhamos|estamos|estou)\b/;

export class LongTermMemory {
    private llm: LlmClient;
    private repo: MemoryRepository;
    private maxFacts: number;

    constructor(llm: LlmClient, repo: MemoryRepository, maxFacts: number = settings.memory.maxFactsInContext) {
        this.llm = llm;
        this.repo = repo;
        this.maxFacts = maxFacts;
    }

    /** Extracts and stores durable facts from what the user just said. Returns the facts stored. */
    async learn(userId: string, userMessage: string): Promise<UserFact[]> {
        if (!SELF_REFERENCE.test(normalize(userMessage)) || containsSensitiveData(userMessage)) {
            return [];
        }

        const raw = await this.llm.chat(
            [
                { role: "system", content: EXTRACTION_PROMPT },
                { role: "user", content: userMessage },
            ],
            { task: "facts", json: true }
        );

        const facts = parseFacts(raw);
        facts.forEach(fact => this.repo.upsertFact(userId, fact));
        return facts;
    }

    /** Facts worth putting in the context for this question: core facts plus the ones it relates to. */
    recall(userId: string, question: string): string[] {
        const facts = this.repo.getFacts(userId);
        const core = facts.filter(fact => CORE_KEYS.has(fact.key));
        const related = facts.filter(
            fact => !CORE_KEYS.has(fact.key) && keywordScore(question, `${fact.key} ${fact.value}`) > 0
        );

        return [...core, ...related].slice(0, this.maxFacts).map(fact => `${fact.key}: ${fact.value}`);
    }
}

function parseFacts(raw: string): UserFact[] {
    try {
        const parsed = JSON.parse(raw) as { facts?: { key?: unknown; value?: unknown }[] };

        return (parsed.facts ?? [])
            .filter(
                (fact): fact is UserFact =>
                    typeof fact.key === "string" &&
                    typeof fact.value === "string" &&
                    (FACT_KEYS as readonly string[]).includes(fact.key) &&
                    fact.value.trim().length > 0 &&
                    fact.value.length <= 120 &&
                    !containsSensitiveData(fact.value)
            )
            .map(fact => ({ key: fact.key, value: fact.value.trim() }));
    } catch {
        return [];
    }
}
