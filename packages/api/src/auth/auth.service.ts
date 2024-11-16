import { Injectable } from '@nestjs/common';
import { clerkClient } from '@clerk/clerk-sdk-node';

@Injectable()
export class AuthService {
  async getUsers() {
    return await clerkClient.users.getUserList();
  }
}
