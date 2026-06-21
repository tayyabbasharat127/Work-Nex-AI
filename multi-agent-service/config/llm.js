import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";

export function resolveLlmProvider() {
  const explicit = process.env.LLM_PROVIDER?.toLowerCase()?.trim();
  if (["ollama", "openrouter", "openai", "anthropic"].includes(explicit)) {
    return explicit;
  }
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "ollama";
}

export function createChatModel(options = {}) {
  const provider = resolveLlmProvider();
  const temperature = options.temperature ?? 0.2;
  const maxRetries = options.maxRetries ?? 2;

  if (provider === "openai") {
    return new ChatOpenAI({
      model: options.model || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      temperature,
      maxRetries,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  if (provider === "openrouter") {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("LLM_PROVIDER=openrouter requires OPENROUTER_API_KEY");
    }

    const config = {
      model: options.model || process.env.OPENROUTER_MODEL || "openrouter/auto",
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

    const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS || options.maxTokens || 0);
    if (Number.isFinite(maxTokens) && maxTokens > 0) {
      config.maxTokens = maxTokens;
    }

    return new ChatOpenAI(config);
  }

  if (provider === "anthropic") {
    return new ChatAnthropic({
      model: options.model || process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      temperature,
      maxRetries,
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  return new ChatOllama({
    model: options.model || process.env.OLLAMA_MODEL || "qwen3.5:9b",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    temperature,
    maxRetries,
  });
}
