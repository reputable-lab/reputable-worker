import { Offchain } from '@ethereum-attestation-service/eas-sdk';
import { SignProtocolClient } from '@ethsign/sp-sdk';
import { prisma } from '@reputable/data-warehouse';
import { Signer } from 'ethers';
import {
  COMMIT_RANGE_0_10,
  COMMIT_RANGE_10_30,
  COMMIT_RANGE_30_PLUS,
  CONTRIBUTORS_WEIGHT_MATRIX,
} from '../config/config';
import { DatabaseService } from '../database/DatabaseService';
import { createAndSaveAttestation } from '../SignProtocol/createAndSaveAttestation';
import logger from '../utils/logger';
import {
  calculateRecencyContributionFactor,
  computeScore,
  isSignProtocolClient,
} from '../utils/utils';

const database = new DatabaseService();

/**
 * Computes and updates reputation scores for all contributors based on their contributions
 * across all repositories, including on-chain metrics from related contracts.
 */
export async function computeReputationScoresForContributor({
  sender,
  client,
}: {
  sender: Signer;
  client: Offchain | SignProtocolClient;
}) {
  try {
    // Fetch all contributors with their contributions and related repositories and contracts
    const contributors = await prisma.contributor.findMany({
      include: {
        contributions: {
          include: {
            repository: {
              include: {
                contracts: true,
              },
            },
          },
        },
      },
    });

    // Calculate the maximum values for contract metrics across all contracts
    const maxValues = await prisma.contract.aggregate({
      _max: {
        numberOfTx: true,
        uniqueFromCount: true,
        tve: true,
      },
    });

    const numberOfTxMax = maxValues._max?.numberOfTx ?? 0;
    const uniqueFromCountMax = maxValues._max?.uniqueFromCount ?? 0;
    const tveMax = maxValues._max?.tve ? Number(maxValues._max.tve) : 0;

    // Iterate over each contributor to calculate and update their reputation score
    for (const [index, contributor] of contributors.entries()) {
      let totalReputationScore = 0;
      const uniqueRepositories = new Set<number>();

      // Fetch the number of contributors for each repository related to this contributor
      const numberOfContributorsPerRepo = await prisma.contribution.groupBy({
        by: ['repositoryId'],
        where: {
          contributorName: contributor.contributorName,
        },
        _count: {
          contributorName: true,
        },
      });

      // Create a map to store the max number of contributors per repository
      const numberOfContributorsMaxMap = new Map<number, number>();

      // Populate the map with repositoryId and number of contributors
      numberOfContributorsPerRepo.forEach((repoAggregate) => {
        numberOfContributorsMaxMap.set(
          repoAggregate.repositoryId,
          repoAggregate._count.contributorName
        );
      });
      const numberOfContributorsMax = Math.max(
        ...Array.from(numberOfContributorsMaxMap.values())
      );

      // Iterate over each contribution to calculate the commit proportion
      for (const contribution of contributor.contributions) {
        const { commitsCount, repository, lastCommitTimestamp } = contribution;

        const numberOfContributors =
          numberOfContributorsMaxMap.get(repository.repositoryId) ?? 0;

        // Aggregate on-chain metrics from all contracts associated with the repository
        const numberOfTx = repository.contracts.reduce(
          (acc, contract) => acc + contract.numberOfTx,
          0
        );
        const uniqueFromCount = repository.contracts.reduce(
          (acc, contract) => acc + contract.uniqueFromCount,
          0
        );
        const tve = repository.contracts.reduce(
          (acc, contract) => acc + Number(contract.tve),
          0.0
        );

        // Calculate the reputation score for this contribution
        const contributionReputationScore = await calculateReputationScore({
          contributorName: contributor.contributorName,
          commitsCount,
          totalCommits: repository.totalCommits,
          numberOfContributors,
          numberOfContributorsMax,
          numberOfTx,
          uniqueFromCount,
          tve,
          numberOfTxMax,
          uniqueFromCountMax,
          tveMax,
          lastCommitTimestamp: lastCommitTimestamp ?? 0,
          sender,
          client,
        });

        // Store the individual contribution metrics and score in the SQLite database
        database.insertContributionMetrics({
          contributorName: contributor.contributorName,
          repositoryId: repository.repositoryId,
          protocolName: contribution.repository.organizationName,
          commitProportion: commitsCount / repository.totalCommits,
          numberOfDevs: numberOfContributors,
          normalizedNumberOfTx: numberOfTx / numberOfTxMax,
          normalizedUniqueFromCount: uniqueFromCount / uniqueFromCountMax,
          normalizedTve: tve / tveMax,
          contributionReputationScore,
        });

        totalReputationScore += contributionReputationScore;
        uniqueRepositories.add(repository.repositoryId);
      }

      // Normalize the total reputation score by the number of unique repositories
      let uniqueRepoFactor = 1;
      if (uniqueRepositories.size > 0) {
        uniqueRepoFactor = Math.log2(uniqueRepositories.size + 1);
        totalReputationScore = Math.round(
          totalReputationScore / uniqueRepositories.size
        );
      }

      // Adjust the total reputation score with the unique repository factor
      totalReputationScore = computeScore({
        value: totalReputationScore * uniqueRepoFactor,
        range: 100,
        k: 0.02,
      });

      logger.info(
        `(${index + 1}/${contributors.length}) Computed reputation score for contributor ${contributor.contributorName}: ${totalReputationScore}`
      );

      // Update the contributor's last reputation score
      await prisma.contributor.update({
        where: {
          contributorName: contributor.contributorName,
        },
        data: {
          lastReputationScore: totalReputationScore,
        },
      });

      // Store the total reputation score in the SQLite database
      database.insertOrUpdateContributorScore(
        contributor.contributorName,
        totalReputationScore
      );

      // Create a new reputation record for historical tracking
      await prisma.contributorReputation.create({
        data: {
          reputationScore: totalReputationScore,
          contributorName: contributor.contributorName,
        },
      });
    }
  } catch (error) {
    logger.error(
      `[computeReputationScoresForContributor] Error computing reputation scores: ${error.message}`
    );
  }
}

/**
 * Calculates the reputation score based on on-chain metrics and commit proportion.
 *
 * @returns {number} The calculated reputation score.
 */
async function calculateReputationScore({
  contributorName,
  commitsCount,
  totalCommits,
  numberOfContributors,
  numberOfContributorsMax,
  numberOfTx,
  uniqueFromCount,
  tve,
  numberOfTxMax,
  uniqueFromCountMax,
  tveMax,
  lastCommitTimestamp,
  sender,
  client,
}: {
  contributorName: string;
  commitsCount: number;
  totalCommits: number;
  numberOfContributors: number;
  numberOfContributorsMax: number;
  numberOfTx: number;
  uniqueFromCount: number;
  tve: number;
  numberOfTxMax: number;
  uniqueFromCountMax: number;
  tveMax: number;
  lastCommitTimestamp: number; // Assuming lastCommitTimestamp is provided in seconds
  sender: Signer;
  client: Offchain | SignProtocolClient;
}): Promise<number> {
  // Determine the commit range for the contributor
  let commitRange;
  if (commitsCount <= 10) {
    commitRange = COMMIT_RANGE_0_10;
  } else if (commitsCount <= 30) {
    commitRange = COMMIT_RANGE_10_30;
  } else {
    commitRange = COMMIT_RANGE_30_PLUS;
  }

  // Retrieve the weights for the specific commit range
  const {
    COMMIT_WEIGHT,
    NB_OF_CONTRIBUTOR_WEIGHT,
    CONTRIBUTION_RECENCY,
    TX_WEIGHT,
    UNIQUE_FROM_WEIGHT,
    TVE_WEIGHT,
  } = CONTRIBUTORS_WEIGHT_MATRIX[commitRange];

  // Ensure the total sum of weights does not exceed 100
  if (
    COMMIT_WEIGHT +
      NB_OF_CONTRIBUTOR_WEIGHT +
      CONTRIBUTION_RECENCY +
      TX_WEIGHT +
      UNIQUE_FROM_WEIGHT +
      TVE_WEIGHT >
    100
  ) {
    throw new Error('The total sum of the weights exceeds 100.');
  }

  // Calculate proportions and normalized values
  const commitProportion = totalCommits === 0 ? 0 : commitsCount / totalCommits;
  const normalizedNumberOfContributors =
    numberOfContributorsMax === 0
      ? 0
      : numberOfContributors / numberOfContributorsMax;
  const normalizedNumberOfTx =
    numberOfTxMax === 0 ? 0 : numberOfTx / numberOfTxMax;
  const normalizedUniqueFromCount =
    uniqueFromCountMax === 0 ? 0 : uniqueFromCount / uniqueFromCountMax;
  const normalizedTve = tveMax === 0 ? 0 : tve / tveMax;

  // Calculate contribution recency factor
  const contributionRecency = calculateRecencyContributionFactor({
    lastCommitTimestamp,
    ...CONTRIBUTION_RECENCY,
  });

  // create and save EAS
  if (isSignProtocolClient(client)) {
    await createAndSaveAttestation({
      contributorName,
      commitsCount,
      commitProportion,
      normalizedContributors: normalizedNumberOfContributors,
      contributionRecency,
      normalizedTx: normalizedNumberOfTx,
      normalizedUniqueFrom: normalizedUniqueFromCount,
      normalizedTve,
      sender,
      client, // Now TypeScript knows this is SignProtocolClient
    });
  } else {
    console.error('Client is not a SignProtocolClient');
    // Handle the case where the client is not a SignProtocolClient
  }
  // Calculate and return the reputation score
  return Math.round(
    commitProportion * COMMIT_WEIGHT +
      normalizedNumberOfContributors * NB_OF_CONTRIBUTOR_WEIGHT +
      contributionRecency +
      normalizedNumberOfTx * TX_WEIGHT +
      normalizedUniqueFromCount * UNIQUE_FROM_WEIGHT +
      normalizedTve * TVE_WEIGHT
  );
}

/**
 * Updates the rank of contributors based on their lastReputationScore.
 */
export async function updateContributorRanks() {
  try {
    const contributors = await prisma.contributor.findMany({
      orderBy: {
        lastReputationScore: 'desc',
      },
    });

    const updatePromises = contributors.map((contributor, index) =>
      prisma.contributor.update({
        where: { contributorName: contributor.contributorName },
        data: { lastRank: index + 1 },
      })
    );

    await Promise.all(updatePromises);

    logger.info('Successfully updated contributor ranks.');
  } catch (error) {
    logger.error(
      `[updateContributorRanks] Error updating contributor ranks: ${error}`
    );
  }
}
