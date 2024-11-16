import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { RepositoriesService } from './repositories/repositories.service';
import { RepositoriesController } from './repositories/repositories.controller';
import { ContributorsController } from './contributors/contributors.controller';
import { ContributorsService } from './contributors/contributors.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProtocolsController } from './protocols/protocols.controller';
import { ProtocolsService } from './protocols/protocols.service';
import { loggerFactory } from './logger/logger.factory'; // Adjust the path as necessary
import { ReputationController } from './reputation/reputation.controller';
import { ReputationService } from './reputation/reputation.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`../../.env.${process.env.NODE_ENV}`],
      isGlobal: true,
    }),
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        loggerFactory(configService),
      inject: [ConfigService],
    }),
    AuthModule,
    PrismaModule,
  ],
  controllers: [
    AppController,
    RepositoriesController,
    ContributorsController,
    ProtocolsController,
    ReputationController,
  ],
  providers: [
    AppService,
    RepositoriesService,
    ContributorsService,
    ProtocolsService,
    ReputationService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
