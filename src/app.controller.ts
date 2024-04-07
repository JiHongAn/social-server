import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getUptime(): { uptime: number } {
    return { uptime: process.uptime() };
  }
}
