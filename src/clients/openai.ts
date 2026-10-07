import openAi from "openai";

export const openai = new openAi({
    apiKey: process.env.OPENAI_API_KEY
});