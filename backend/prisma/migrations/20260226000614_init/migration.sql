-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "browser_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turns" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "turn_number" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "changelog_entries" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "turn_number" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "superseded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "changelog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state_docs" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_updated_at_turn" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "state_docs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_browser_id_idx" ON "conversations"("browser_id");

-- CreateIndex
CREATE INDEX "turns_conversation_id_turn_number_idx" ON "turns"("conversation_id", "turn_number");

-- CreateIndex
CREATE UNIQUE INDEX "turns_conversation_id_turn_number_role_key" ON "turns"("conversation_id", "turn_number", "role");

-- CreateIndex
CREATE INDEX "changelog_entries_conversation_id_idx" ON "changelog_entries"("conversation_id");

-- CreateIndex
CREATE INDEX "changelog_entries_conversation_id_category_idx" ON "changelog_entries"("conversation_id", "category");

-- CreateIndex
CREATE INDEX "changelog_entries_conversation_id_superseded_by_idx" ON "changelog_entries"("conversation_id", "superseded_by");

-- CreateIndex
CREATE UNIQUE INDEX "state_docs_conversation_id_key" ON "state_docs"("conversation_id");

-- AddForeignKey
ALTER TABLE "turns" ADD CONSTRAINT "turns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "state_docs" ADD CONSTRAINT "state_docs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
