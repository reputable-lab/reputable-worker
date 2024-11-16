import { describe, it } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { fetchContributorsAndTheirContributionsForAllRepository } from '../../src/contributors/fetchContributors.js';
import logger from '../../src/utils/logger.js';

beforeAll(() => {
  jest.spyOn(logger, 'log').mockImplementation(jest.fn());
  jest.spyOn(logger, 'info').mockImplementation(jest.fn());
  jest.spyOn(logger, 'warn').mockImplementation(jest.fn());
  jest.spyOn(logger, 'error').mockImplementation(jest.fn());
});

describe('fetchContributorsByRepository()', () => {
  it('should work', async () => {
    const repository: Prisma.RepositoryCreateManyInput = {
      name: 'aave-v3-periphery',
      owner: 'aave',
    };
    await fetchContributorsAndTheirContributionsForAllRepository([repository]);
  });
});
