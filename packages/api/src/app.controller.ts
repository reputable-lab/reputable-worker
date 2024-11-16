import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SkipAuth } from './auth/auth.guard';
import { ApiOperation } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipAuth()
  @Get()
  @ApiOperation({
    summary: 'Root Reputable',
    description: 'Test the Reputable REST API is running',
  })
  getReputable() {
    return this.appService.getReputable();
  }
}
