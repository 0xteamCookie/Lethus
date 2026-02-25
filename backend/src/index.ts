import express from "express";
import cors from "cors";
import { config } from "./config";
import { prisma } from "./db/prisma";
import { milvus, ensureMilvusCollection } from "./db/milvus";
import { handleChatCompletion } from "./proxy/handler";

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(
  cors({
    origin: config.corsOrigins,
    exposedHeaders: [
      "X-Lethus-Conversation-Id",
      "X-Lethus-Reduction-Percent",
      "X-Lethus-Intent",
      "X-Lethus-Processing-Ms",
    ],
  }),
);
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

// ── List Conversations ────────────────────────────────────────
app.get("/conversations", async (req, res) => {
  try {
    const browserId = req.headers["x-lethus-browser-id"] as string | undefined;

    const where = browserId ? { browserId } : {};
    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        turns: {
          orderBy: { turnNumber: "desc" },
          take: 1,
          select: { content: true, role: true },
        },
        _count: { select: { turns: true } },
      },
    });

    res.json(
      conversations.map((c) => ({
        id: c.id,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        turnCount: Math.floor(c._count.turns / 2),
        lastMessage: c.turns[0]?.content?.slice(0, 100) ?? null,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// ── Conversation Turns ────────────────────────────────────────
app.get("/conversations/:id/turns", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const before = Number(req.query.before) || undefined;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const turns = await prisma.turn.findMany({
      where: {
        conversationId: id,
        ...(before ? { turnNumber: { lt: before } } : {}),
      },
      orderBy: { turnNumber: "asc" },
      take: limit,
    });

    res.json(turns);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch turns" });
  }
});

// ── Conversation Changelog ────────────────────────────────────
app.get("/conversations/:id/changelog", async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const entries = await prisma.changelogEntry.findMany({
      where: { conversationId: id, supersededBy: null },
      orderBy: { turnNumber: "asc" },
    });

    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch changelog" });
  }
});

// ── Conversation State Doc ────────────────────────────────────
app.get("/conversations/:id/state", async (req, res) => {
  try {
    const { id } = req.params;

    const stateDoc = await prisma.stateDoc.findUnique({
      where: { conversationId: id },
    });

    res.json({
      content: stateDoc?.content ?? null,
      version: stateDoc?.version ?? 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch state doc" });
  }
});

// ── Delete Conversation ───────────────────────────────────────
app.delete("/conversations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await prisma.conversation.delete({ where: { id } });

    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete conversation" });
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
