import { octokit } from './client.js';

const CONTRACT_ADDRESS = '...';
const BLOCKSCOUT_API = 'https://eth.blockscout.com/api';

async function getVerifiedSourceCode(contractAddress) {
  const url = `${BLOCKSCOUT_API}?module=contract&action=getsourcecode&address=${contractAddress}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !data.result || data.result.length === 0) {
      throw new Error('Failed to fetch verified source code');
    }

    const mainSource = data.result[0].SourceCode;
    const additionalSources = data.result[0].AdditionalSources || [];

    return {
      mainSource,
      additionalSources,
    };
  } catch (error) {
    console.error('Error fetching verified source code:', error);
    return null;
  }
}

function extractRepoInfo(sources) {
  const repoInfo = {
    imports: [],
    packageNames: [],
    potentialRepoNames: new Set(),
  };

  const processSource = (sourceCode) => {
    // Extract import statements
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    const imports = [...sourceCode.matchAll(importRegex)].map(
      (match) => match[1]
    );
    repoInfo.imports.push(...imports);

    // Extract potential package names from imports
    const packageNames = imports
      .map((imp) => imp.split('/')[0])
      .filter((name) => !name.startsWith('.') && !name.startsWith('@'));
    repoInfo.packageNames.push(...packageNames);

    // Extract potential repo names from comments
    const commentRegex = /\/\/.*|\/\*[\s\S]*?\*\//g;
    const comments = sourceCode.match(commentRegex) || [];
    const urlRegex = /https?:\/\/github\.com\/([^\/\s]+\/[^\/\s]+)/g;
    comments.forEach((comment) => {
      const matches = [...comment.matchAll(urlRegex)];
      matches.forEach((match) => repoInfo.potentialRepoNames.add(match[1]));
    });

    // Extract potential repo names from pragma statements
    const pragmaRegex = /pragma\s+solidity\s+.*?;/g;
    const pragmas = sourceCode.match(pragmaRegex) || [];
    pragmas.forEach((pragma) => {
      const versionMatch = pragma.match(/\d+\.\d+\.\d+/);
      if (versionMatch) {
        repoInfo.potentialRepoNames.add(`ethereum/solidity`);
      }
    });
  };

  // Process main source
  processSource(sources.mainSource);

  // Process additional sources
  sources.additionalSources.forEach((source) => {
    processSource(source.SourceCode);
  });

  // Add package names to potential repo names
  repoInfo.packageNames.forEach((name) =>
    repoInfo.potentialRepoNames.add(name)
  );

  // Remove duplicates
  repoInfo.imports = [...new Set(repoInfo.imports)];
  repoInfo.packageNames = [...new Set(repoInfo.packageNames)];

  return repoInfo;
}

async function findGitHubRepo(repoInfo) {
  const searchResults = [];

  // Search for exact repo names first
  for (const repoName of repoInfo.potentialRepoNames) {
    try {
      const { data } = await octokit.rest.search.repos({
        q: `repo:${repoName}`,
        sort: 'stars',
        order: 'desc',
      });

      if (data.items.length > 0) {
        searchResults.push({
          name: repoName,
          url: data.items[0].html_url,
          stars: data.items[0].stargazers_count,
          exactMatch: true,
        });
      }
    } catch (error) {
      console.error(`Error searching for repo ${repoName}:`, error);
    }
  }

  // If no exact matches, search for package names
  if (searchResults.length === 0) {
    for (const packageName of repoInfo.packageNames) {
      try {
        const { data } = await octokit.rest.search.repos({
          q: `${packageName} in:name`,
          sort: 'stars',
          order: 'desc',
        });

        if (data.items.length > 0) {
          searchResults.push({
            name: packageName,
            url: data.items[0].html_url,
            stars: data.items[0].stargazers_count,
            exactMatch: false,
          });
        }
      } catch (error) {
        console.error(`Error searching for package ${packageName}:`, error);
      }
    }
  }

  // Sort results by stars and exact match
  searchResults.sort((a, b) => {
    if (a.exactMatch && !b.exactMatch) return -1;
    if (!a.exactMatch && b.exactMatch) return 1;
    return b.stars - a.stars;
  });

  return searchResults.length > 0 ? searchResults[0] : null;
}

async function main() {
  console.log('Fetching verified source code...');
  const sources = await getVerifiedSourceCode(CONTRACT_ADDRESS);

  if (!sources) {
    console.log('Failed to fetch source code. Exiting.');
    return;
  }

  console.log('Extracting repo information...');
  const repoInfo = extractRepoInfo(sources);

  console.log('Potential repo names:', repoInfo.potentialRepoNames);
  console.log('Package names:', repoInfo.packageNames);

  if (
    repoInfo.potentialRepoNames.size === 0 &&
    repoInfo.packageNames.length === 0
  ) {
    console.log('No potential repo or package names found in the source code.');
    return;
  }

  console.log('Searching for GitHub repo...');
  const repoResult = await findGitHubRepo(repoInfo);

  if (repoResult) {
    console.log('Found potential GitHub repo:', repoResult.url);
    console.log(
      'Match type:',
      repoResult.exactMatch ? 'Exact match' : 'Package name match'
    );
    console.log('Stars:', repoResult.stars);
  } else {
    console.log('No matching GitHub repo found.');
  }
}

main().catch((error) => console.error('Unhandled error:', error));
