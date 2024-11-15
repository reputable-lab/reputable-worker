import { PrismaClient } from '@reputable/data-warehouse';
import logger from '../utils/logger';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Inserts or updates the total reputation score for a contributor.
   */
  public async insertOrUpdateContributorScore(
    contributorName: string,
    totalReputationScore: number
  ) {
    try {
      await this.prisma.contributor.upsert({
        where: { contributorName },
        update: { lastReputationScore: totalReputationScore },
        create: {
          contributorName,
          lastReputationScore: totalReputationScore,
        },
      });
      logger.info(
        `Inserted/Updated total reputation score for ${contributorName}`
      );
    } catch (error) {
      logger.error(
        `Error inserting/updating contributor score: ${error.message}`
      );
    }
  }

  /**
   * Inserts a contribution with its associated metrics for a specific contributor.
   */
  public async insertContributionMetrics({
    contributorName,
    repositoryId,
    protocolName,
    commitProportion,
    normalizedNumberOfTx,
    normalizedUniqueFromCount,
    normalizedTve,
    contributionReputationScore,
    numberOfDevs,
  }: {
    contributorName: string;
    repositoryId: number;
    protocolName: string;
    commitProportion: number;
    normalizedNumberOfTx: number;
    normalizedUniqueFromCount: number;
    normalizedTve: number;
    contributionReputationScore: number;
    numberOfDevs: number;
  }) {
    try {
      // Get or create the contributor
      const contributor = await this.prisma.contributor.findUnique({
        where: { contributorName },
      });

      if (!contributor) {
        throw new Error(`Contributor with name ${contributor} not found.`);
      }

      await this.prisma.contribution.update({
        where: {
          contributorName_repositoryId: {
            contributorName: contributor.contributorName,
            repositoryId: repositoryId,
          },
        },
        data: {
          contributionReputationScore,
          protocolName,
          commitProportion,
          normalizedNumberOfTx,
          normalizedUniqueFromCount,
          normalizedTve,
          numberOfDevs,
        },
      });

      logger.info(`Update contribution metrics for ${contributorName}`);
    } catch (error) {
      logger.error(`Error Updating contribution metrics: ${error.message}`);
    }
  }
}
