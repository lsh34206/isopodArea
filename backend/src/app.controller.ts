import { Controller, Get, Post } from '@nestjs/common';

import { AppService } from './app.service';
@Controller('home')
export class AppController {
    constructor(private readonly appService: AppService) {}

   
    @Get('/')
    async getHomeStats() {
        return await this.appService.getStats();
    }

}
