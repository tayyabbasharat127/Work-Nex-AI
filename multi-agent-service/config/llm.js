import { ChatOpenAI } from "@langchain/openai";

export function resolveLlmProvider() {
  return "openrouter";
}

export function createChatModel(options = {}) {
  const temperature = options.temperature ?? 0.2;
  const maxRetries = options.maxRetries ?? 2;

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required");
  }

  const config = {
    model: options.model || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    temperature,
    maxRetries,
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
        "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "WorkNex Multi-Agent Service",
      },
    },
  };

  const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS || options.maxTokens || 800);
  if (Number.isFinite(maxTokens) && maxTokens > 0) {
    config.maxTokens = maxTokens;
  }

  return new ChatOpenAI(config);
}
