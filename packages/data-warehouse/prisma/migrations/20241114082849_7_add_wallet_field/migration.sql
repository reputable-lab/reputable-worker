/*
  Warnings:

  - Made the column `signature` on table `Attestation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Attestation" ALTER COLUMN "signature" SET NOT NULL;

-- AlterTable
ALTER TABLE "Contributor" ADD COLUMN     "contributorWallet" TEXT;
