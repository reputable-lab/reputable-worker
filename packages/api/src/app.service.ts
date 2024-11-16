import { Injectable } from '@nestjs/common';
import * as packageJson from '../package.json';
@Injectable()
export class AppService {
  getReputable() {
    return {
      message: 'Welcome to Reputable REST API!',
      version: packageJson.version,
    };
  }
}
