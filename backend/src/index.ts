import express from "express";
import { config } from "./config";
import { prisma } from "./db/prisma";
import { milvus, ensureMilvusCollection } from "./db/milvus";
import { handleChatCompletion } from "./proxy/handler";

const app = express();

// ── Middleware ───────────────────────────────────────────────
// Parse JSON bodies. Limit to 10MB to handle large conversation payloads.
app.use(express.json({ limit: "10mb" }));

// ── Health Check ─────────────────────────────────────────────
// Used by Docker, load balancers, and the verify script.
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const milvusHealth = await milvus.checkHealth();
    res.json({
      status: "ok",
      postgres: "connected",
      milvus: milvusHealth.isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ── Observability Endpoint ────────────────────────────────────
// Returns conversation metadata — useful for the demo dashboard.
app.get("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [conversation, turns, changelog, stateDoc] = await Promise.all([
      prisma.conversation.findUnique({ where: { id } }),
      prisma.turn.count({ where: { conversationId: id } }),
      prisma.changelogEntry.findMany({
        where: { conversationId: id, supersededBy: null },
        orderBy: { turnNumber: "asc" },
      }),
      prisma.stateDoc.findUnique({ where: { conversationId: id } }),
    ]);

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.json({
      id: conversation.id,
      turnCount: Math.floor(turns / 2),
      activeChangelogEntries: changelog,
      stateDoc: stateDoc?.content ?? null,
      stateDocVersion: stateDoc?.version ?? 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// ── Main Proxy Endpoint ───────────────────────────────────────
// Drop-in replacement for OpenAI's /v1/chat/completions.
app.post("/v1/chat/completions", handleChatCompletion);

// ── Startup ───────────────────────────────────────────────────
async function start() {
  console.log("\n🚀 Starting Lethus AI...\n");

  // Verify database connections before accepting traffic
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("  ✅ PostgreSQL connected");
  } catch (error) {
    console.error("  ❌ PostgreSQL connection failed:", error);
    process.exit(1);
  }

  try {
    await ensureMilvusCollection();
    console.log("  ✅ Milvus collection ready");
  } catch (error) {
    console.error("  ❌ Milvus connection failed:", error);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(
      `\n  ✅ Lethus proxy running on http://localhost:${config.port}`,
    );
    console.log(
      `\n  Endpoint: POST http://localhost:${config.port}/v1/chat/completions`,
    );
    console.log(`  Health:   GET  http://localhost:${config.port}/health`);
    console.log(
      `\n  To use: set your OpenAI client's baseURL to http://localhost:${config.port}`,
    );
    console.log(
      `  Pass X-Lethus-Conversation-Id header to maintain conversation state\n`,
    );
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("\nShutting down gracefully...");
    await prisma.$disconnect();
    await milvus.closeConnection();
    process.exit(0);
  });
}

start().catch((error) => {
  console.error("Failed to start:", error);
  process.exit(1);
});
