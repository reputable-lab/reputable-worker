import 'dotenv/config';
import { Octokit } from 'octokit';

export const octokit = new Octokit({
  auth: process.env.GITHUB_API_TOKEN,
});
