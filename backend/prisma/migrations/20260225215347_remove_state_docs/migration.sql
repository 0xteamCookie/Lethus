/*
  Warnings:

  - You are about to drop the `state_docs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "state_docs" DROP CONSTRAINT "state_docs_conversation_id_fkey";

-- DropTable
DROP TABLE "state_docs";
