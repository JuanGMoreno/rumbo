import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CacheController } from './cache.controller.js';
import { RedisModule } from './redis.module.js';

@Module({
  imports: [RedisModule],
  controllers: [AppController, CacheController],
  providers: [AppService],
})
export class AppModule {}
