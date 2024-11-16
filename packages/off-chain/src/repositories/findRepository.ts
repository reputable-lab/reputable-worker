import fs from 'fs/promises';
import { prisma } from '@reputable/data-warehouse';
import { request } from 'undici';
import { octokit } from '../client.js';
import { FindRepoFromContractSource } from '../types/types.js';
import logger from '../utils/logger.js';
import { isImportFile } from '../utils/utils.js';

async function getContractDBInfoAddresses() {
  const contracts = await prisma.contract.findMany({
    select: {
      address: true,
    },
  });
  return contracts.map((contract) => contract.address);
}

export async function getContractDBInfoSourceCode(address: string) {
  logger.info('Request to Etherscan API');
  const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`;

  const { statusCode, body } = await request(url);
  if (statusCode !== 200) {
    throw new Error(
      'HTTP error while fetching contract source code from Etherscan'
    );
  }

  const data: any = await body.json();
  if (data?.status !== '1') {
    throw new Error('Smart Contract not verified on Etherscan');
  }

  let sourceCode = data?.result[0]?.SourceCode;
  sourceCode = sourceCode.substring(1, sourceCode.length - 1); // JSON received from the API begins with {{ and finishes with }}
  return JSON.parse(sourceCode);
}

async function findReposFromContractSource({
  fileContent,
  filterRepos = [],
  specificFilePath = null,
}: FindRepoFromContractSource) {
  try {
    logger.info('Request to Github API');
    const baseQuery = `+in:file+extension:sol`;
    let pathQuery = '';
    let repoQuery = '';

    // Handle specific file paths
    if (specificFilePath) {
      const pathSegments = specificFilePath.split('/');
      const fileName = pathSegments.pop();
      const directoryPath = pathSegments.join('/');
      pathQuery += `+filename:${fileName}`;
      if (directoryPath.length > 0) {
        pathQuery += `+path:${directoryPath}/`;
      }
    }

    const baseAndPathQueryLength = baseQuery.length + pathQuery.length;
    const maxRepoQueryLength = 300; // My choice, max length for repo

    const repoList = [];
    if (filterRepos.length) {
      // Sort repositories by name length to maximize the number of included repositories
      filterRepos.sort((a, b) => a.length - b.length);

      let currentLength = 0;

      for (const repo of filterRepos) {
        // Calculate length assuming `+repo:` for each repo and include it in the total length from the start
        // Each repository needs `+repo:` prefix which adds 6 characters for `repo:` and 1 for `+`
        const repoNameLength = repo?.repository?.full_name.length + 6;
        if (currentLength + repoNameLength > maxRepoQueryLength) break;
        repoList.push('repo:' + repo?.repository?.full_name); // Do not add the `+` here, it will be added in join
        currentLength += repoNameLength;
      }

      repoQuery = '+' + repoList.join('+');
    }

    // Calculate the maximum length for sourceCodeSnippet
    const fixedQueryLength = baseAndPathQueryLength + repoQuery.length;
    const maxSnippetLength = 1000 - fixedQueryLength;
    const sourceCodeSnippet = fileContent.substring(0, maxSnippetLength);

    // Construct the full query
    const query = `${sourceCodeSnippet}${baseQuery}${pathQuery}${repoQuery}`;

    const results = await octokit.paginate(octokit.rest.search.code, {
      q: query,
      per_page: 100, // Max allowed per page for this endpoint
    });

    // Handle recursion if necessary
    if (repoList.length < filterRepos.length) {
      const remainingRepos = filterRepos.slice(repoList.length);
      const moreResults = await findReposFromContractSource({
        fileContent,
        filterRepos: remainingRepos,
        specificFilePath,
      });
      return [...new Set([...results, ...moreResults])];
    }

    return results;
  } catch (error) {
    if (
      error.status === 403 &&
      error.message.includes('Request quota exhausted for request')
    ) {
      logger.error(
        '[findReposFromContractSource] GitHub API rate limit exceeded. Please wait ...'
      );
    } else {
      logger.error(
        `[findReposFromContractSource] Failed to search GitHub for source code: ${error}`
      );
    }
    return [];
  }
}

async function run() {
  try {
    // const contractAddresses = await getContractDBInfoAddresses();
    // 'For' loop on contractAddresses ...
    const address = '0xe592427a0aece92de3edee1f18e0157c05861564'; // SwapRouter v3

    const sourceCode = await getContractDBInfoSourceCode(address);
    await fs.writeFile('contract.json', JSON.stringify(sourceCode, null, 2));

    let repositories = [];
    for (const filePath in sourceCode.sources) {
      const fileContent = sourceCode.sources[filePath].content;
      if (isImportFile(filePath)) {
        continue;
      }
      repositories = await findReposFromContractSource({
        fileContent,
        filterRepos: repositories,
        specificFilePath: filePath,
      });
      logger.info(
        `Repositories found for file ${filePath}: ${repositories.length}`
      );
      // Stop searching if no repositories found or exactly one repository is found
      if (repositories.length === 0 || repositories.length === 1) break;
    }

    if (repositories.length > 0) {
      logger.info(
        `Repositories found for the contract ${address}: ${repositories.length}`
      );
      await fs.writeFile(
        'repoFind.json',
        JSON.stringify(
          repositories.map((item) => item?.repository?.full_name),
          null,
          2
        )
      );
    } else {
      logger.info(`No repositories found for the contract ${address}.`);
    }
  } catch (error) {
    logger.error(`Error occurred during execution: ${error}`);
  }
}

run();
