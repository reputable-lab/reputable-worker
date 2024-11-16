import { Test, TestingModule } from '@nestjs/testing';
import { RepositoriesController } from '../../src/repositories/repositories.controller';
import { RepositoriesService } from '../../src/repositories/repositories.service';

describe('RepositoriesController', () => {
  let controller: RepositoriesController;
  let repositoriesService: RepositoriesService;

  beforeEach(async () => {
    const mockRepositoriesService = {
      // mock methods used by RepositoriesController if necessary
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepositoriesController],
      providers: [
        {
          provide: RepositoriesService,
          useValue: mockRepositoriesService,
        },
      ],
    }).compile();

    controller = module.get<RepositoriesController>(RepositoriesController);
    repositoriesService = module.get<RepositoriesService>(RepositoriesService);
    console.log(repositoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
