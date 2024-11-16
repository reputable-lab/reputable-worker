-- AlterTable
ALTER TABLE "Contribution" ADD COLUMN     "commitProportion" DOUBLE PRECISION,
ADD COLUMN     "contributionReputationScore" INTEGER,
ADD COLUMN     "normalizedNumberOfTx" DOUBLE PRECISION,
ADD COLUMN     "normalizedTve" DOUBLE PRECISION,
ADD COLUMN     "normalizedUniqueFromCount" DOUBLE PRECISION,
ADD COLUMN     "numberOfDevs" INTEGER,
ADD COLUMN     "protocolName" TEXT;
