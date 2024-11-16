import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContributorDto } from './reputation.dto';

@Injectable()
export class ReputationService {
  constructor(private prisma: PrismaService) {}

  async getContributionsByContributor({ contributorName }: ContributorDto) {
    const contributions = await this.prisma.contribution.findMany({
      where: { contributorName },
      select: {
        contributionReputationScore: true,
        protocolName: true,
        commitProportion: true,
        normalizedNumberOfTx: true,
        normalizedUniqueFromCount: true,
        normalizedTve: true,
        numberOfDevs: true,
      },
    });

    return contributions;
  }
}
