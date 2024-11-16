import { Test, TestingModule } from '@nestjs/testing';
import { ProtocolsService } from '../../src/protocols/protocols.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import { transports, format } from 'winston';

describe('ProtocolsService', () => {
  let service: ProtocolsService;

  beforeEach(async () => {
    const mockPrismaService = {
      // mock methods used by ProtocolsService if necessary
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [`.env.test`], // Adjust the environment file path
        }),
        WinstonModule.forRoot({
          transports: [
            new transports.Console({
              format: format.combine(
                format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike()
              ),
            }),
          ],
        }),
      ],
      providers: [
        ProtocolsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProtocolsService>(ProtocolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
