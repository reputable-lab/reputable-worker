import { Test, TestingModule } from '@nestjs/testing';
import { RepositoriesService } from '../../src/repositories/repositories.service';
import { PrismaService } from '../../src/prisma/prisma.service'; // Adjust the import path as necessary

describe('RepositoriesService', () => {
  let service: RepositoriesService;

  beforeEach(async () => {
    const mockPrismaService = {
      // mock methods used by RepositoriesService if necessary
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RepositoriesService>(RepositoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
