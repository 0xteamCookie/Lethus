import { ensureMilvusCollection, milvus, EMBEDDING_DIM } from "../db/milvus";

async function main() {
  console.log(`\nInitializing Milvus collection (${EMBEDDING_DIM}-dim)...\n`);

  try {
    await ensureMilvusCollection();
    console.log("\n✅ Milvus collection ready");
  } catch (error) {
    console.error("\n❌ Milvus initialization failed:", error);
    process.exit(1);
  } finally {
    await milvus.closeConnection();
  }
}

main();
