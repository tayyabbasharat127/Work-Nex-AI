import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

let checkpointer = null;
let memoryStatus = {
  shortTerm: "disabled",
  checkpointer: "none",
  persistence: "none",
};

function isEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase().trim());
}

function getMemoryDatabaseUrl() {
  return process.env.AGENT_MEMORY_DATABASE_URL || process.env.POSTGRES_URI || "";
}

export async function initializeMemory() {
  if (checkpointer) {
    return { checkpointer, status: memoryStatus };
  }

  const provider = String(process.env.AGENT_MEMORY_PROVIDER || "postgres").toLowerCase().trim();
  const allowInMemoryFallback = isEnabled(process.env.AGENT_MEMORY_ALLOW_IN_MEMORY_FALLBACK);
  const databaseUrl = getMemoryDatabaseUrl();
  const schema = process.env.AGENT_MEMORY_SCHEMA || "public";

  if (provider === "postgres") {
    if (!databaseUrl) {
      if (!allowInMemoryFallback) {
        throw new Error("AGENT_MEMORY_DATABASE_URL is required when AGENT_MEMORY_PROVIDER=postgres");
      }

      checkpointer = new MemorySaver();
      memoryStatus = {
        shortTerm: "enabled",
        checkpointer: "MemorySaver",
        persistence: "process-memory",
        fallback: true,
      };
      return { checkpointer, status: memoryStatus };
    }

    checkpointer = PostgresSaver.fromConnString(databaseUrl, { schema });
    await checkpointer.setup();
    memoryStatus = {
      shortTerm: "enabled",
      checkpointer: "PostgresSaver",
      persistence: "postgres",
      schema,
      databaseConfigured: true,
    };
    return { checkpointer, status: memoryStatus };
  }

  checkpointer = new MemorySaver();
  memoryStatus = {
    shortTerm: "enabled",
    checkpointer: "MemorySaver",
    persistence: "process-memory",
  };
  return { checkpointer, status: memoryStatus };
}

export function getShortTermCheckpointer() {
  if (!checkpointer) {
    throw new Error("Memory has not been initialized. Call initializeMemory() before creating agents.");
  }
  return checkpointer;
}

export function getMemoryStatus() {
  return memoryStatus;
}
