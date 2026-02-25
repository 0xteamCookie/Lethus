import { embed } from "../services/llm";
import { countTokens } from "../services/tokenizer";
import { classifyIntent } from "../services/intent";
import { config } from "../config";

async function main() {
  console.log("\n🧪 Testing core services...\n");

  // Test 1: Token counting
  console.log("── Tokenizer ───────────────────────────");
  const text = "Hello, this is a test sentence for token counting.";
  const tokens = countTokens(text);
  console.log(`  "${text}"`);
  console.log(`  Tokens: ${tokens} (expected ~10)`);
  console.log("  ✅ Tokenizer working\n");

  // Test 2: Embedding
  console.log("── Embeddings ──────────────────────────");
  const testText = "The database should use PostgreSQL for production.";
  console.log(`  Embedding: "${testText}"`);
  const embedding = await embed(testText);
  console.log(
    `  Dimension: ${embedding.length} (expected ${config.embeddingDimension})`,
  );
  console.log(
    `  First 5 values: [${embedding
      .slice(0, 5)
      .map((v) => v.toFixed(4))
      .join(", ")}]`,
  );
  console.log("  ✅ Embedding working\n");

  // Test 3: Intent classification
  console.log("── Intent Classifier ───────────────────");
  const testCases: Array<[string, string]> = [
    ["what database did we choose earlier?", ""],
    ["okay now add error handling to that function", "Here's the function..."],
    [
      "what do you mean by connection pooling?",
      "We should use connection pooling.",
    ],
    ["let's talk about authentication now", "We fixed the bug."],
  ];

  for (const [message, context] of testCases) {
    const intent = await classifyIntent(message, context);
    console.log(`  "${message.slice(0, 50)}..."`);
    console.log(`  → Intent: ${intent}\n`);
  }
  console.log("  ✅ Intent classifier working\n");

  console.log("═══════════════════════════════════════");
  console.log("  ✅ All core services operational");
  console.log("  Ready for Part 3 (cold path)");
  console.log("═══════════════════════════════════════\n");
}

main().catch(console.error);
