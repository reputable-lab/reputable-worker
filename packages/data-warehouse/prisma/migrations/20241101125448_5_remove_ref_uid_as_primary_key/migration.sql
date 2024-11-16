/*
  Warnings:

  - The primary key for the `Attestation` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "Attestation" DROP CONSTRAINT "Attestation_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id");
