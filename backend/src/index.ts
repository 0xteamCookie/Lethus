import { config } from "./config";

console.log(`Lethus AI — Part 1 complete`);
console.log(`Port configured: ${config.port}`);
console.log(
  `Embedding model: ${config.embeddingModel} (${config.embeddingDimension}-dim)`,
);
console.log(`Milvus collection: ${config.milvusCollection}`);
console.log(`\nAll infrastructure ready. Proceed to Part 2.`);
