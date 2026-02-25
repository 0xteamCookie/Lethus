import { prisma } from "../db/prisma";
import {
  milvus,
  COLLECTION_NAME,
  EMBEDDING_DIM,
  ensureMilvusCollection,
} from "../db/milvus";
import { config } from "../config";

async function verifyPostgres(): Promise<boolean> {
  console.log("── PostgreSQL ───────────────────────────");
  try {
    const result = await prisma.$queryRaw<{ version: string }[]>`
      SELECT version()
    `;
    console.log("  Connected:", result[0].version.slice(0, 55));

    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    const tableNames = tables.map((t) => t.tablename);
    console.log("  Tables:", tableNames.join(", "));

    const required = [
      "conversations",
      "turns",
      "changelog_entries",
    ];
    const missing = required.filter((t) => !tableNames.includes(t));

    if (missing.length > 0) {
      console.log("  ❌ Missing tables:", missing.join(", "));
      console.log("     Fix: npm run db:migrate");
      return false;
    }

    console.log("  ✅ All tables present\n");
    return true;
  } catch (error) {
    console.error("  ❌ Connection failed:", error);
    console.log("  Fix: docker compose up -d && wait for postgres healthy");
    return false;
  }
}

async function verifyMilvus(): Promise<boolean> {
  console.log("── Milvus ──────────────────────────────");
  try {
    const health = await milvus.checkHealth();
    console.log("  Healthy:", health.isHealthy);

    if (!health.isHealthy) {
      console.log("  ❌ Milvus is not healthy");
      console.log("  Fix: docker compose logs milvus");
      return false;
    }

    await ensureMilvusCollection();

    const stats = await milvus.getCollectionStatistics({
      collection_name: COLLECTION_NAME,
    });
    console.log(
      `  Collection '${COLLECTION_NAME}': ` +
        `${stats.data.row_count} rows, ${EMBEDDING_DIM}-dim`,
    );
    console.log("  ✅ Milvus ready\n");
    return true;
  } catch (error) {
    console.error("  ❌ Connection failed:", error);
    console.log("  Fix: docker compose up -d && wait ~90s for milvus healthy");
    return false;
  }
}

async function verifyOpenAI(): Promise<boolean> {
  console.log("── OpenAI API ───────────────────────────");
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${config.openaiKey}` },
    });

    if (response.ok) {
      console.log(`  Embedding model: ${config.embeddingModel}`);
      console.log(`  Embedding dimension: ${config.embeddingDimension}`);
      console.log("  ✅ API key valid\n");
      return true;
    } else {
      const body = (await response.json()) as { error?: { message: string } };
      console.log("  ❌ API error:", body.error?.message);
      console.log("  Fix: check OPENAI_API_KEY in .env");
      return false;
    }
  } catch (error) {
    console.error("  ❌ Request failed:", error);
    return false;
  }
}

async function main() {
  console.log("\n🔍 Verifying Lethus infrastructure...\n");
  console.log(`  Embedding model:     ${config.embeddingModel}`);
  console.log(`  Embedding dimension: ${config.embeddingDimension}`);
  console.log(`  Milvus collection:   ${config.milvusCollection}\n`);

  const [pg, mv, ai] = await Promise.all([
    verifyPostgres(),
    verifyMilvus(),
    verifyOpenAI(),
  ]);

  const allPassed = pg && mv && ai;

  console.log("═".repeat(42));
  if (allPassed) {
    console.log("  ✅ All systems operational");
    console.log("  Ready for Part 2 (core services)");
  } else {
    console.log("  ❌ Some checks failed — fix above before continuing");
  }
  console.log("═".repeat(42) + "\n");

  await prisma.$disconnect();
  await milvus.closeConnection();

  if (!allPassed) process.exit(1);
}

main();
