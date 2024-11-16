import { prisma } from '@reputable/data-warehouse';
import { ORGANIZATION_WEIGHT_MATRIX } from '../config/config';
import logger from '../utils/logger';
import {
  calculateRecencyContributionFactor,
  computeScore,
} from '../utils/utils';
/**
 * Computes and updates reputation scores for all organizations by making
 * a weighted logarithmic average of the contributors' reputation scores and
 * the metrics from the organization's smart contracts.
 */
export async function computeReputationScoresForOrganizations() {
  try {
    // Fetch all organizations with their contributors' last reputation scores and contract metrics aggregated
    const organizationsWithContributorsAndContracts =
      await prisma.organization.findMany({
        include: {
          repositories: {
            select: {
              contributions: {
                select: {
                  lastCommitTimestamp: true,
                  contributor: {
                    select: {
                      contributorName: true,
                      lastReputationScore: true,
                    },
                  },
                },
              },
              contracts: true,
            },
          },
        },
      });

    // Collect update promises for each organization
    const updatePromises = organizationsWithContributorsAndContracts.map(
      async (organization, index) => {
        const contributorsMap = new Map();
        let lastCommitTimestamp = null;

        let totalNumberOfTx = 0;
        let totalUniqueFromCount = 0;
        let totalTve = 0.0;

        const uniqueContributors = new Set(); // Set to track unique contributors

        // Iterate over each repository and its contributions/contracts
        organization.repositories.forEach((repository) => {
          repository.contracts.forEach((contract) => {
            totalNumberOfTx += contract.numberOfTx;
            totalUniqueFromCount += contract.uniqueFromCount;
            totalTve += Number(contract.tve);
          });

          repository.contributions.forEach((contribution) => {
            const { contributor, lastCommitTimestamp: contributionTimestamp } =
              contribution;

            // Track the latest lastCommitTimestamp
            if (
              contributionTimestamp &&
              (!lastCommitTimestamp ||
                contributionTimestamp > lastCommitTimestamp)
            ) {
              lastCommitTimestamp = contributionTimestamp;
            }

            // Track unique contributors
            if (
              contributor &&
              !contributorsMap.has(contributor.contributorName)
            ) {
              contributorsMap.set(contributor.contributorName, contributor);
              uniqueContributors.add(contributor.contributorName);
            }
          });
        });

        // Calculate the aggregated score from contributors
        const contributors = Array.from(contributorsMap.values());
        const contributorsReputationScore =
          calculateLogarithmicReputationScore(contributors);

        // Get max values for normalization
        const maxValues = await prisma.contract.aggregate({
          _max: {
            numberOfTx: true,
            uniqueFromCount: true,
            tve: true,
          },
        });

        const numberOfTxMax = maxValues._max?.numberOfTx ?? 0;
        const uniqueFromCountMax = maxValues._max?.uniqueFromCount ?? 0;
        const tveMax = maxValues._max.tve ? Number(maxValues._max.tve) : 0;

        // Normalize the contract metrics
        const normalizedNumberOfTx =
          numberOfTxMax === 0 ? 0 : totalNumberOfTx / numberOfTxMax;
        const normalizedUniqueFromCount =
          uniqueFromCountMax === 0
            ? 0
            : totalUniqueFromCount / uniqueFromCountMax;
        const normalizedTve = tveMax === 0 ? 0 : totalTve / tveMax;

        // Calculate the aggregated score from contracts
        const contractsReputationScore = calculateContractsReputationScore({
          normalizedNumberOfTx,
          normalizedUniqueFromCount,
          normalizedTve,
        });

        // Calculate contribution recency factor for the organization
        const contributionRecency = calculateRecencyContributionFactor({
          lastCommitTimestamp,
          ...ORGANIZATION_WEIGHT_MATRIX.CONTRIBUTION_RECENCY,
        });

        // Calculate the number of unique contributors
        const numberOfContributors = uniqueContributors.size;
        // Count repositories for the organization
        const repoCount = organization.repositories.length;

        // Combine the scores with their respective weights
        const combinedReputationScore = computeScore({
          value:
            ORGANIZATION_WEIGHT_MATRIX.CONTRIBUTORS_WEIGHT *
              (contributionRecency +
                contributorsReputationScore +
                ORGANIZATION_WEIGHT_MATRIX.NB_OF_CONTRIBUTOR_WEIGHT *
                  numberOfContributors +
                ORGANIZATION_WEIGHT_MATRIX.NB_OF_REPOSITORY_WEIGHT *
                  repoCount) +
            ORGANIZATION_WEIGHT_MATRIX.PROTOCOL_WEIGHT *
              contractsReputationScore,
          range: 100,
          k: 0.02,
        });

        logger.info(
          `(${index + 1}/${organizationsWithContributorsAndContracts.length}) Computed reputation score for organization ${organization.organizationName}: ${combinedReputationScore}`
        );

        // Update lastReputationScore for the organization
        await prisma.organization.update({
          where: {
            organizationName: organization.organizationName,
          },
          data: {
            lastReputationScore: combinedReputationScore,
          },
        });

        // Create a new organization reputation record for historical purposes
        await prisma.organizationReputation.create({
          data: {
            reputationScore: combinedReputationScore,
            organizationName: organization.organizationName,
          },
        });
      }
    );

    // Wait for all update promises to complete
    await Promise.all(updatePromises);

    logger.info(
      'Successfully computed reputation scores for all organizations.'
    );
  } catch (error) {
    logger.error(
      `[computeReputationScoresForOrganizations] Error computing reputation scores for organizations: ${error}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Calculates the logarithmic weighted average reputation score for an organization based on its contributors' reputation scores.
 *
 * @param contributors - An array of contributors with their last reputation scores.
 * @returns {number} The calculated logarithmic weighted average reputation score.
 */
function calculateLogarithmicReputationScore(contributors) {
  const totalReputationScore = contributors.reduce((sum, contributor) => {
    return sum + (contributor.lastReputationScore ?? 0);
  }, 0);

  const contributorCount = contributors.length;
  const averageReputationScore =
    contributorCount > 0 ? totalReputationScore / contributorCount : 0;

  return contributorCount > 0
    ? Math.round(averageReputationScore * Math.log2(contributorCount + 1))
    : 0;
}

/**
 * Calculates the reputation score based on normalized on-chain metrics from smart contracts.
 *
 * @param normalizedNumberOfTx - The normalized total number of transactions.
 * @param normalizedUniqueFromCount - The normalized unique count of addresses interacted with.
 * @param normalizedTve - The normalized total value exchanged.
 * @returns {number} The calculated reputation score based on contract metrics.
 */
function calculateContractsReputationScore({
  normalizedNumberOfTx,
  normalizedUniqueFromCount,
  normalizedTve,
}: {
  normalizedNumberOfTx: number;
  normalizedUniqueFromCount: number;
  normalizedTve: number;
}): number {
  return Math.round(
    normalizedNumberOfTx * ORGANIZATION_WEIGHT_MATRIX.TX_WEIGHT +
      normalizedUniqueFromCount *
        ORGANIZATION_WEIGHT_MATRIX.UNIQUE_FROM_WEIGHT +
      normalizedTve * ORGANIZATION_WEIGHT_MATRIX.TVE_WEIGHT
  );
}

/**
 * Updates the rank of organizations based on their lastReputationScore.
 */
export async function updateOrganizationRanks() {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: {
        lastReputationScore: 'desc',
      },
    });

    const updatePromises = organizations.map((organization, index) =>
      prisma.organization.update({
        where: { organizationName: organization.organizationName },
        data: { lastRank: index + 1 },
      })
    );

    await Promise.all(updatePromises);

    logger.info('Successfully updated organization ranks.');
  } catch (error) {
    logger.error(
      `[updateOrganizationRanks] Error updating organization ranks: ${error}`
    );
  }
}
