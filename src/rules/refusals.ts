import { settings } from "../config/settings.ts";
import type { RefusalReason } from "./types.ts";

const HUMAN_SUPPORT = "suporte@flowdesk.example (dias úteis, das 9h às 18h, horário de Brasília)";

export const REFUSALS: Record<RefusalReason, string> = {
    empty: "Não recebi nenhuma pergunta. Pode escrever sua dúvida sobre a FlowDesk?",
    too_long: `Sua mensagem é muito longa. Resuma a dúvida em até ${settings.input.maxLength} caracteres.`,
    prompt_injection:
        "Não posso alterar minhas instruções nem agir fora do meu papel. Posso ajudar com dúvidas sobre o uso da FlowDesk.",
    sensitive_data:
        "Por segurança, não compartilhe senhas, tokens, números de cartão ou documentos por aqui. Reformule a dúvida sem esses dados.",
    out_of_scope:
        "Só consigo ajudar com dúvidas sobre a FlowDesk (projetos, issues, boards, sprints, workflows, permissões, planos e integrações). Posso ajudar com algo nesse tema?",
    no_knowledge: `Não encontrei essa informação na documentação da FlowDesk. Para não te passar nada incorreto, recomendo falar com o suporte humano: ${HUMAN_SUPPORT}.`,
    ungrounded_output: `Não consegui confirmar essa resposta com segurança na documentação. Para evitar informação incorreta, reformule a pergunta ou fale com o suporte humano: ${HUMAN_SUPPORT}.`,
};

export const SMALLTALK_REPLY =
    "Olá! Sou o assistente de suporte da FlowDesk. Se tiver alguma dúvida sobre a plataforma, é só perguntar.";

export const CLARIFY_REPLY =
    "Não entendi bem a que você se refere. Pode dar mais detalhes sobre o que deseja fazer na FlowDesk (por exemplo: projeto, issue, board, sprint, plano ou integração)?";

export const ACKNOWLEDGE_REPLY = "Obrigado, anotei essas informações. Em que posso ajudar na FlowDesk?";
