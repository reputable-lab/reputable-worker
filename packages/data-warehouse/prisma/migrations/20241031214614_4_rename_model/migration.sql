/*
  Warnings:

  - You are about to drop the `EAS` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EAS" DROP CONSTRAINT "EAS_contributorName_fkey";

-- DropTable
DROP TABLE "EAS";

-- CreateTable
CREATE TABLE "Attestation" (
    "refUID" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "attester" TEXT NOT NULL,
    "schema" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "time" BIGINT NOT NULL,
    "expirationTime" BIGINT NOT NULL,
    "revocable" BOOLEAN NOT NULL,
    "data" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "signatureV" INTEGER NOT NULL,
    "signatureR" TEXT NOT NULL,
    "signatureS" TEXT NOT NULL,
    "contributorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("refUID")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_contributorName_key" ON "Attestation"("contributorName");

-- CreateIndex
CREATE INDEX "Attestation_refUID_idx" ON "Attestation"("refUID");

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_contributorName_fkey" FOREIGN KEY ("contributorName") REFERENCES "Contributor"("contributorName") ON DELETE RESTRICT ON UPDATE CASCADE;
