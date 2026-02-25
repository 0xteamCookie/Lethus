import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Check your .env file against .env.example`,
    );
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function numericEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${name} must be a number, got: ${raw}`,
    );
  }
  return parsed;
}

export const config = {
  // Database
  databaseUrl: requireEnv("DATABASE_URL"),

  // Milvus
  milvusAddress: optionalEnv("MILVUS_ADDRESS", "localhost:19530"),

  // OpenAI — used for text-embedding-3-small and cold path LLM calls
  openaiKey: requireEnv("OPENAI_API_KEY"),

  // Upstream LLM — where user-facing chat requests get forwarded
  upstreamUrl: requireEnv("UPSTREAM_LLM_URL"),
  upstreamKey: requireEnv("UPSTREAM_LLM_KEY"),

  // Server
  port: numericEnv("PORT", 3001),

  // CORS -- "*" allows all origins, otherwise comma-separated list
  corsOrigins: (() => {
    const raw = optionalEnv("CORS_ORIGINS", "http://localhost:3000");
    if (raw === "*") return "*" as const;
    return raw.split(",").map((s) => s.trim());
  })(),

  // Embedding — text-embedding-3-small produces 1536-dimensional vectors.
  // This dimension must match the Milvus collection exactly.
  // If you change the model, you must also drop and recreate the collection.
  embeddingModel: optionalEnv("EMBEDDING_MODEL", "text-embedding-3-small"),
  embeddingDimension: numericEnv("EMBEDDING_DIMENSION", 1536),

  // Milvus collection
  milvusCollection: optionalEnv("MILVUS_COLLECTION", "turn_embeddings"),

  // Algorithm parameters
  coldStartThreshold: numericEnv("COLD_START_THRESHOLD", 5),
  retrievalTokenBudget: numericEnv("RETRIEVAL_TOKEN_BUDGET", 2000),
  recentTurnsCount: numericEnv("RECENT_TURNS_COUNT", 3),
  kadaneTheta: numericEnv("KADANE_THETA", 1.0),
  gainShift: numericEnv("GAIN_SHIFT", 0.6),
  changelogBoost: numericEnv("CHANGELOG_BOOST", 1.0),
  changelogNeighborBoost: numericEnv("CHANGELOG_NEIGHBOR_BOOST", 0.3),

  // Context reduction — when incoming messages exceed this token
  // count, Lethus trims the middle using Kadane-scored grouping.
  agenticTokenThreshold: numericEnv("AGENTIC_TOKEN_THRESHOLD", 80000),
  // Number of recent messages to always preserve (covers active tool rounds).
  agenticTailPreserve: numericEnv("AGENTIC_TAIL_PRESERVE", 40),
} as const;

// Freeze to prevent accidental mutation at runtime
Object.freeze(config);
