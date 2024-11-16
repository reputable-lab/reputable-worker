/*
  Warnings:

  - You are about to drop the column `signatureR` on the `Attestation` table. All the data in the column will be lost.
  - You are about to drop the column `signatureS` on the `Attestation` table. All the data in the column will be lost.
  - You are about to drop the column `signatureV` on the `Attestation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Attestation" DROP COLUMN "signatureR",
DROP COLUMN "signatureS",
DROP COLUMN "signatureV",
ADD COLUMN     "signature" TEXT;
