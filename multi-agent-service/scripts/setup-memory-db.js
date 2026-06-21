import dotenv from "dotenv";
import pg from "pg";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

dotenv.config();

const DEFAULT_MEMORY_URL = "postgresql://postgres:postgres@localhost:5432/worknex_agent_memory?sslmode=disable";
const targetUrl = process.env.AGENT_MEMORY_DATABASE_URL || process.env.POSTGRES_URI || DEFAULT_MEMORY_URL;
const schema = process.env.AGENT_MEMORY_SCHEMA || "public";

function quoteIdentifier(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`Unsafe database identifier: ${value}`);
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function buildAdminUrl(memoryUrl) {
  if (process.env.AGENT_MEMORY_ADMIN_DATABASE_URL) {
    return process.env.AGENT_MEMORY_ADMIN_DATABASE_URL;
  }

  const parsed = new URL(memoryUrl);
  parsed.pathname = "/postgres";
  return parsed.toString();
}

async function databaseExists(client, databaseName) {
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
  return result.rowCount > 0;
}

async function ensureDatabase() {
  const parsed = new URL(targetUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!databaseName) throw new Error("AGENT_MEMORY_DATABASE_URL must include a database name.");

  const adminClient = new pg.Client({ connectionString: buildAdminUrl(targetUrl) });
  await adminClient.connect();
  try {
    if (await databaseExists(adminClient, databaseName)) {
      console.log(`Memory database already exists: ${databaseName}`);
      return;
    }

    await adminClient.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    console.log(`Created memory database: ${databaseName}`);
  } finally {
    await adminClient.end();
  }
}

async function setupCheckpointer() {
  const checkpointer = PostgresSaver.fromConnString(targetUrl, { schema });
  await checkpointer.setup();
  await checkpointer.end?.();
  console.log(`Postgres checkpoint tables are ready in schema: ${schema}`);
}

async function main() {
  await ensureDatabase();
  await setupCheckpointer();
  console.log("WorkNex multi-agent Postgres memory setup complete.");
}

main().catch((error) => {
  console.error("Failed to setup WorkNex multi-agent memory:", error.message);
  process.exit(1);
});
