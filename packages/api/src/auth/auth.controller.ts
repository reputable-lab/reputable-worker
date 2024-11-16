import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SkipAuth } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @SkipAuth()
  @Get('users')
  getUsers() {
    return this.authService.getUsers();
  }

  @Get()
  getHello(): string {
    return 'You are authenticated';
  }
}
