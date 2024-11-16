import 'dotenv/config';
import { Octokit } from 'octokit';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const JSON_PRC = 'https://rpc.ankr.com/eth';

export const client = createPublicClient({
  chain: mainnet,
  transport: http(`${JSON_PRC}`),
});

export const octokit = new Octokit({
  auth: process.env.GITHUB_API_TOKEN,
});
