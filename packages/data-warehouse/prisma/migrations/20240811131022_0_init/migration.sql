-- CreateTable
CREATE TABLE "Contributor" (
    "contributorName" TEXT NOT NULL,
    "totalCommits" INTEGER NOT NULL DEFAULT 0,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "lastRank" INTEGER DEFAULT -1,
    "lastReputationScore" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contributor_pkey" PRIMARY KEY ("contributorName")
);

-- CreateTable
CREATE TABLE "ContributorReputation" (
    "contributorReputationId" SERIAL NOT NULL,
    "rank" INTEGER DEFAULT -1,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "contributorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributorReputation_pkey" PRIMARY KEY ("contributorReputationId")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "contributionId" SERIAL NOT NULL,
    "commitsCount" INTEGER NOT NULL DEFAULT 0,
    "lastCommitTimestamp" INTEGER NOT NULL,
    "contributorName" TEXT NOT NULL,
    "repositoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("contributionId")
);

-- CreateTable
CREATE TABLE "Organization" (
    "organizationName" TEXT NOT NULL,
    "tags" TEXT[],
    "firstCommit" INTEGER,
    "numberOfRepos" INTEGER,
    "numberOfDevs" INTEGER,
    "numberOfCommits" INTEGER,
    "lastRank" INTEGER DEFAULT -1,
    "lastReputationScore" INTEGER DEFAULT 0,
    "activeContributor" INTEGER,
    "newContributor" INTEGER,
    "uniqueContributor" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("organizationName")
);

-- CreateTable
CREATE TABLE "OrganizationReputation" (
    "organizationReputationId" SERIAL NOT NULL,
    "rank" INTEGER DEFAULT -1,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "organizationName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationReputation_pkey" PRIMARY KEY ("organizationReputationId")
);

-- CreateTable
CREATE TABLE "Repository" (
    "repositoryId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "firstCommits" INTEGER,
    "organizationName" TEXT,
    "owner" TEXT NOT NULL,
    "totalCommits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("repositoryId")
);

-- CreateTable
CREATE TABLE "Contract" (
    "address" TEXT NOT NULL,
    "creationBlockNumber" INTEGER NOT NULL,
    "numberOfTx" INTEGER NOT NULL DEFAULT 0,
    "uniqueFromCount" INTEGER NOT NULL DEFAULT 0,
    "tve" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "repositoryID" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "CronRun" (
    "id" SERIAL NOT NULL,
    "cronType" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishAt" TIMESTAMP(3),
    "lastBlockProcessed" INTEGER,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_contributorName_repositoryId_key" ON "Contribution"("contributorName", "repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_owner_name_key" ON "Repository"("owner", "name");

-- AddForeignKey
ALTER TABLE "ContributorReputation" ADD CONSTRAINT "ContributorReputation_contributorName_fkey" FOREIGN KEY ("contributorName") REFERENCES "Contributor"("contributorName") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_contributorName_fkey" FOREIGN KEY ("contributorName") REFERENCES "Contributor"("contributorName") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("repositoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationReputation" ADD CONSTRAINT "OrganizationReputation_organizationName_fkey" FOREIGN KEY ("organizationName") REFERENCES "Organization"("organizationName") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_organizationName_fkey" FOREIGN KEY ("organizationName") REFERENCES "Organization"("organizationName") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_repositoryID_fkey" FOREIGN KEY ("repositoryID") REFERENCES "Repository"("repositoryId") ON DELETE SET NULL ON UPDATE CASCADE;
