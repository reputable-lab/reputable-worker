import { Test, TestingModule } from '@nestjs/testing';
import { ProtocolsController } from '../../src/protocols/protocols.controller';
import { ProtocolsService } from '../../src/protocols/protocols.service';

describe('ProtocolsController', () => {
  let controller: ProtocolsController;
  let protocolsService: ProtocolsService;

  beforeEach(async () => {
    const mockProtocolsService = {
      // mock methods used by ProtocolsController if necessary
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProtocolsController],
      providers: [
        {
          provide: ProtocolsService,
          useValue: mockProtocolsService,
        },
      ],
    }).compile();

    controller = module.get<ProtocolsController>(ProtocolsController);
    protocolsService = module.get<ProtocolsService>(ProtocolsService);
    console.log(protocolsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
