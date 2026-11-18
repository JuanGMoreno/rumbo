import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CacheController } from './cache.controller.js';
import { RedisModule } from './redis.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [RedisModule, PrismaModule],
  controllers: [AppController, CacheController],
  providers: [AppService],
})
export class AppModule {}
