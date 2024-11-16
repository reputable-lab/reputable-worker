import { prisma } from '@reputable/data-warehouse';
import {
  fetchContributorsAndTheirContributionsForAllRepository,
  updateContributorsTotalCommits,
} from './contributors/fetchContributors.js';
import { setAgeForOrganizations } from './organizations/ageOfOrganizations.js';
import { calculateAndUpdateMetrics } from './organizations/developers.js';
import { countWeb3RepositoriesFromOrg } from './organizations/updateOrganizations.js';
import logger from './utils/logger.js';

export async function offChain() {
  // start a timer
  logger.profile('Off-Chain');
  try {
    const cronRun = await prisma.cronRun.create({
      data: {
        cronType: 'offChain',
        finishAt: null,
      },
    });

    const repositories = await prisma.repository.findMany();
    logger.info('-> fetchAndUpdateContributionsForContributors()');
    await fetchContributorsAndTheirContributionsForAllRepository(repositories);

    //########################################################################
    // Section : Processing data for contributor
    //########################################################################
    const contributors = await prisma.contributor.findMany({
      include: {
        contributions: true,
      },
    });
    logger.info(`Contributors to handle: ${contributors.length}`);

    const contributorPromises = contributors.map((contrib, index) => {
      logger.info(`Handling contributor ${index + 1} / ${contributors.length}`);
      logger.info(`Fetching data for Contributor: ${contrib.contributorName}`);

      const { totalCommits } = updateContributorsTotalCommits({
        contributor: contrib,
      });

      return prisma.contributor.update({
        where: { contributorName: contrib.contributorName },
        data: { totalCommits },
      });
    });
    await Promise.all(contributorPromises);

    //########################################################################
    // Section : Processing data for organization
    //########################################################################
    const organizations = await prisma.organization.findMany({
      include: {
        repositories: true,
      },
    });
    logger.info(`Organizations to handle: ${organizations.length}`);

    const organizationPromises = organizations.map(async (org, index) => {
      logger.info(
        `Handling organization ${index + 1} / ${organizations.length}`
      );
      logger.info(`Fetching data for Organization: ${org.organizationName}`);

      const repositoriesForOrg = await prisma.repository.findMany({
        where: {
          organizationName: org.organizationName,
        },
        orderBy: {
          firstCommits: 'asc',
        },
      });

      const [countWeb3Data, metricsData] = await Promise.all([
        countWeb3RepositoriesFromOrg({
          organizationName: org.organizationName,
          repositories: repositoriesForOrg,
        }),
        calculateAndUpdateMetrics({
          organization: org,
          repositories: repositoriesForOrg,
        }),
      ]);

      const ageData = setAgeForOrganizations({
        organizationName: org.organizationName,
        oldestRepo: repositoriesForOrg[0],
      });

      return prisma.organization.update({
        where: {
          organizationName: org.organizationName,
        },
        data: {
          numberOfRepos: countWeb3Data.numberOfRepos,
          numberOfCommits: countWeb3Data.numberOfCommits,
          numberOfDevs: countWeb3Data.numberOfDevs,
          activeContributor: metricsData.activeContributor,
          uniqueContributor: metricsData.uniqueContributor,
          newContributor: metricsData.newContributor,
          firstCommit: ageData.firstCommit,
        },
      });
    });

    await Promise.all(organizationPromises);

    // Update the cron run record
    await prisma.cronRun.update({
      where: { id: cronRun.id },
      data: {
        finishAt: new Date(),
      },
    });
  } catch (error) {
    logger.error(`[Off-Chain] error occurred: ${error}`);
    throw error;
  } finally {
    // End the timer and log the duration
    logger.profile('Off-Chain');

    await prisma.$disconnect();
    process.exit();
  }
}

offChain().catch((error) => {
  logger.error(error);
  process.exitCode = 1;
});
