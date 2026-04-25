import { Injectable } from '@nestjs/common';

// Simple application service used by the healthcheck/root controller.
// This central service currently provides a basic status message for the API.
@Injectable()
export class AppService {
  getHello(): string {
    return 'Backend API is running!';
  }
}
