-- CreateTable
CREATE TABLE "EAS" (
    "refUID" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "attester" TEXT NOT NULL,
    "schema" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "time" BIGINT NOT NULL,
    "expirationTime" BIGINT NOT NULL,
    "revocable" BOOLEAN NOT NULL,
    "data" BYTEA NOT NULL,
    "salt" TEXT NOT NULL,
    "signatureV" INTEGER NOT NULL,
    "signatureR" TEXT NOT NULL,
    "signatureS" TEXT NOT NULL,
    "contributorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EAS_pkey" PRIMARY KEY ("refUID")
);

-- CreateIndex
CREATE UNIQUE INDEX "EAS_contributorName_key" ON "EAS"("contributorName");

-- CreateIndex
CREATE INDEX "EAS_refUID_idx" ON "EAS"("refUID");

-- AddForeignKey
ALTER TABLE "EAS" ADD CONSTRAINT "EAS_contributorName_fkey" FOREIGN KEY ("contributorName") REFERENCES "Contributor"("contributorName") ON DELETE RESTRICT ON UPDATE CASCADE;
