/*
  Warnings:

  - You are about to drop the column `tags` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "tags";

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "tags" TEXT[];
