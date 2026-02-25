// End-to-end demo that shows Lethus memory working.
//
// Simulates a technical project conversation with:
//   - Decisions made early
//   - A decision later changed (supersession)
//   - An issue raised and resolved
//   - Questions asked across the full conversation history
//
// Shows:
//   - Token reduction over time
//   - Correct recall of early decisions
//   - Awareness of superseded decisions
//   - Observability metadata per turn

import { randomUUID } from "crypto";

const BASE_URL = "http://localhost:3000";

// ── Demo Conversation ─────────────────────────────────────────
// This is the script for the demo. Each item is a user message.
// We pause between turns and show what Lethus is doing.

const CONVERSATION_SCRIPT = [
  "Hi! We're building a task management API for a small team. What tech stack do you recommend?",
  "Let's go with Node.js and Express. What database should we use?",
  "PostgreSQL sounds good. Let's use it. What should our core data models be?",
  "Create a tasks table with: id, title, description, status, assigned_to, created_at, due_date",
  "Now let's set up authentication. JWT or sessions?",
  "Go with JWT. How should we structure the auth middleware?",
  "The team just told me they want to switch to SQLite since we're demoing locally and don't need concurrent writes",
  "Okay, implement the user registration endpoint with bcrypt for password hashing",
  "There's a problem — the bcrypt hashing is blocking the event loop and slowing everything down",
  "Let me know when you've fixed it",
  "The fix worked! Now let's implement the tasks CRUD endpoints",
  "Add input validation with zod for the task creation endpoint",
  "Let's add pagination to the GET /tasks endpoint",
  "What database did we decide to use? I want to double-check before we write the migration",
  "What was the performance issue we ran into and how did we fix it?",
  "Remind me — did we choose JWT or sessions for auth?",
  "Now let's add a search endpoint for tasks",
  "Add rate limiting to the auth endpoints",
  "We're getting close to done. Can you summarize all the key architectural decisions we've made?",
  "What open issues are still unresolved in our project?",
];

// ── API Call Helper ───────────────────────────────────────────
async function sendMessage(
  conversationId: string,
  message: string,
  turnNumber: number,
): Promise<{
  content: string;
  metadata: Record<string, string>;
}> {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Lethus-Conversation-Id": conversationId,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful software engineer assistant. " +
            "Help the user build their application. " +
            "Be concise but complete.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: {
      lethus_metadata?: {
        original_tokens: number;
        retrieved_tokens: number;
        reduction_percent: number;
        intent: string;
        spans_selected: Array<{ start: number; end: number }>;
        changelog_entries_used: number;
        processing_ms: number;
      };
    };
  };

  const content = data.choices[0]?.message?.content ?? "";
  const meta = data.usage?.lethus_metadata;

  return {
    content,
    metadata: {
      originalTokens: String(meta?.original_tokens ?? 0),
      retrievedTokens: String(meta?.retrieved_tokens ?? 0),
      reductionPercent: String(meta?.reduction_percent ?? 0),
      intent: meta?.intent ?? "UNKNOWN",
      spansSelected: JSON.stringify(meta?.spans_selected ?? []),
      changelogEntriesUsed: String(meta?.changelog_entries_used ?? 0),
      processingMs: String(meta?.processing_ms ?? 0),
    },
  };
}

// ── Get Conversation State ────────────────────────────────────
async function getConversationState(conversationId: string) {
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}`);
  return response.json() as Promise<{
    turnCount: number;
    activeChangelogEntries: Array<{
      turnNumber: number;
      category: string;
      content: string;
    }>;
    stateDoc: string | null;
    stateDocVersion: number;
  }>;
}

// ── Sleep Helper ──────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main Demo ─────────────────────────────────────────────────
async function runDemo() {
  const conversationId = randomUUID();

  console.log("\n" + "═".repeat(60));
  console.log("  LETHUS AI — Live Demo");
  console.log("═".repeat(60));
  console.log(`\n  Conversation ID: ${conversationId}`);
  console.log(`  Total turns: ${CONVERSATION_SCRIPT.length}`);
  console.log("  Watching: token reduction, intent, span selection\n");
  console.log("═".repeat(60) + "\n");

  for (let i = 0; i < CONVERSATION_SCRIPT.length; i++) {
    const turnNumber = i + 1;
    const message = CONVERSATION_SCRIPT[i];

    console.log(
      `\n── Turn ${turnNumber}/${CONVERSATION_SCRIPT.length} ─────────────────────────`,
    );
    console.log(`  User: ${message}`);

    try {
      const { content, metadata } = await sendMessage(
        conversationId,
        message,
        turnNumber,
      );

      // Show response (truncated for demo)
      const truncatedResponse =
        content.length > 150 ? content.slice(0, 150) + "..." : content;
      console.log(`\n  Assistant: ${truncatedResponse}`);

      // Show Lethus metadata
      const reduction = parseInt(metadata.reductionPercent);
      const spans = JSON.parse(metadata.spansSelected) as Array<{
        start: number;
        end: number;
      }>;

      console.log("\n  📊 Lethus Metadata:");
      console.log(`    Intent:           ${metadata.intent}`);
      console.log(
        `    Tokens:           ${metadata.retrievedTokens} / ${metadata.originalTokens} ` +
          `(${reduction > 0 ? `${reduction}% saved` : "cold start"})`,
      );
      if (spans.length > 0) {
        console.log(
          `    Spans selected:   ${spans
            .map((s) => `T${s.start}-T${s.end}`)
            .join(", ")}`,
        );
      }
      console.log(`    Changelog events: ${metadata.changelogEntriesUsed}`);
      console.log(`    Hot path time:    ${metadata.processingMs}ms`);

      // Show conversation state at turn 7 (after SQLite switch)
      // and at turn 14 (recall question)
      if (turnNumber === 7 || turnNumber === 14 || turnNumber === 19) {
        console.log("\n  🧠 Conversation State Snapshot:");
        // Wait a moment for writeback to complete
        await sleep(2000);
        const state = await getConversationState(conversationId);
        console.log(`    Turn count: ${state.turnCount}`);
        console.log(
          `    Active changelog entries: ${state.activeChangelogEntries.length}`,
        );
        if (state.activeChangelogEntries.length > 0) {
          console.log("    Active entries:");
          state.activeChangelogEntries.forEach((e) => {
            console.log(`      [T${e.turnNumber}] ${e.category}: ${e.content}`);
          });
        }
        if (state.stateDoc) {
          console.log(`\n    State Doc (v${state.stateDocVersion}):`);
          state.stateDoc.split("\n").forEach((line) => {
            console.log(`      ${line}`);
          });
        }
      }
    } catch (error) {
      console.error(`\n  ❌ Turn ${turnNumber} failed:`, error);
      console.log("  Continuing demo...");
    }

    // Small delay between turns to avoid rate limiting
    await sleep(500);
  }

  // ── Final Summary ─────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("  Demo Complete — Final State");
  console.log("═".repeat(60));

  await sleep(2000); // Let last writeback complete
  const finalState = await getConversationState(conversationId);

  console.log(`\n  Total turns: ${finalState.turnCount}`);
  console.log(
    `  Active changelog entries: ${finalState.activeChangelogEntries.length}`,
  );
  console.log(`  State doc version: ${finalState.stateDocVersion}`);

  if (finalState.stateDoc) {
    console.log("\n  Final State Document:");
    console.log("  " + "-".repeat(40));
    finalState.stateDoc.split("\n").forEach((line) => {
      console.log(`  ${line}`);
    });
    console.log("  " + "-".repeat(40));
  }

  console.log(
    "\n  ✅ Demo complete. The conversation above used significantly " +
      "fewer tokens than a naive full-context approach.\n",
  );
}

runDemo().catch((error) => {
  console.error("Demo failed:", error);
  process.exit(1);
});
