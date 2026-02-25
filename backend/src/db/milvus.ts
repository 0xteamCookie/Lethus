import { MilvusClient, DataType } from "@zilliz/milvus2-sdk-node";
import { config } from "../config";

const globalForMilvus = globalThis as unknown as {
  milvus: MilvusClient | undefined;
};

export const milvus =
  globalForMilvus.milvus ?? new MilvusClient({ address: config.milvusAddress });

if (process.env.NODE_ENV !== "production") {
  globalForMilvus.milvus = milvus;
}

export const COLLECTION_NAME = config.milvusCollection;
export const EMBEDDING_DIM = config.embeddingDimension; // 1536 for text-embedding-3-small

// ── Collection Schema ─────────────────────────────────────────
// Five fields:
//
//   id              — primary key, format: "{conversationId}_{turnNumber}"
//                     e.g. "a3f2c1d0-..._12"
//
//   conversation_id — which conversation this embedding belongs to.
//                     Used as a filter in every search so results stay
//                     scoped to the current conversation.
//
//   turn_number     — which turn exchange this embedding represents.
//                     Used to map search results back to PostgreSQL rows.
//
//   role            — always "combined" in this system.
//                     Each turn exchange (user + assistant) produces one
//                     embedding from their concatenated text. Storing
//                     "combined" makes this explicit and leaves room to
//                     store per-role embeddings in future.
//
//   embedding       — 1536-dimensional float vector produced by
//                     OpenAI's text-embedding-3-small model.
//                     This is what similarity search operates on.

export async function ensureMilvusCollection(): Promise<void> {
  const hasCollection = await milvus.hasCollection({
    collection_name: COLLECTION_NAME,
  });

  if (hasCollection.value) {
    console.log(
      `Milvus collection '${COLLECTION_NAME}' already exists (${EMBEDDING_DIM}-dim)`,
    );
    // Load into memory so it's ready for immediate search
    await milvus.loadCollection({ collection_name: COLLECTION_NAME });
    return;
  }

  console.log(
    `Creating Milvus collection '${COLLECTION_NAME}' ` +
      `with ${EMBEDDING_DIM}-dim embeddings...`,
  );

  await milvus.createCollection({
    collection_name: COLLECTION_NAME,
    fields: [
      {
        name: "id",
        data_type: DataType.VarChar,
        is_primary_key: true,
        max_length: 128, // "{uuid}_{turnNumber}" — generous limit
        description: "Composite ID: conversationId_turnNumber",
      },
      {
        name: "conversation_id",
        data_type: DataType.VarChar,
        max_length: 64,
        description: "UUID of the conversation in PostgreSQL",
      },
      {
        name: "turn_number",
        data_type: DataType.Int64,
        description: "Turn number within this conversation",
      },
      {
        name: "role",
        data_type: DataType.VarChar,
        max_length: 16,
        description: "Always 'combined' — one embedding per turn exchange",
      },
      {
        name: "embedding",
        data_type: DataType.FloatVector,
        dim: EMBEDDING_DIM,
        description: `${EMBEDDING_DIM}-dim vector from text-embedding-3-small`,
      },
    ],
  });

  // ── Index ──────────────────────────────────────────────────
  // IVF_FLAT: Inverted File index with exact flat comparison.
  //
  // How it works:
  //   Training: divides all vectors into nlist=128 clusters via k-means.
  //   Search: finds the nprobe closest clusters, then does exact
  //           comparison against all vectors in those clusters.
  //
  // Why IVF_FLAT over HNSW:
  //   HNSW is faster but uses significantly more memory.
  //   For a hackathon dataset (< 5000 vectors), IVF_FLAT is
  //   fast enough and uses a fraction of the RAM.
  //
  // metric_type IP (Inner Product):
  //   text-embedding-3-small returns L2-normalized vectors.
  //   For normalized vectors: inner_product = cosine_similarity.
  //   IP is faster to compute than L2 distance on normalized vectors.
  //   Result range: [-1, 1] where 1 = identical, -1 = opposite.
  await milvus.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: "embedding",
    index_type: "IVF_FLAT",
    metric_type: "IP",
    params: { nlist: 128 },
  });

  // Load into memory — required before any search can run
  await milvus.loadCollection({ collection_name: COLLECTION_NAME });

  console.log(
    `✅ Milvus collection '${COLLECTION_NAME}' created, indexed, and loaded`,
  );
}
