import {
  milvus,
  COLLECTION_NAME,
  EMBEDDING_DIM,
  ensureMilvusCollection,
} from "../db/milvus";

async function main() {
  console.log(`\nResetting Milvus collection '${COLLECTION_NAME}'...`);
  console.log(`Target dimension: ${EMBEDDING_DIM}\n`);

  try {
    const exists = await milvus.hasCollection({
      collection_name: COLLECTION_NAME,
    });

    if (exists.value) {
      console.log("Dropping existing collection...");
      await milvus.dropCollection({ collection_name: COLLECTION_NAME });
      console.log("Dropped.");
    } else {
      console.log("Collection did not exist. Skipping drop.");
    }

    console.log("Creating collection with correct dimensions...");
    await ensureMilvusCollection();
    console.log(`\n✅ Collection recreated with ${EMBEDDING_DIM}-dim index`);
  } catch (error) {
    console.error("\n❌ Reset failed:", error);
    process.exit(1);
  } finally {
    await milvus.closeConnection();
  }
}

main();
