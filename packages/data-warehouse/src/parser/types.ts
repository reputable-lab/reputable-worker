export type ParserMetrics = {
  countNoRepoLink: number;
  countNoSmartContractAddress: number;
  countNoCreationBlockNumber: number;
  countHasNoValidGithubEntity: number;
};

export type GithubEntity = {
  organizationName: string;
  repoOwner: string;
  repoName: string;
};
