import { Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { RedisService } from './redis.service.js';

@Controller('cache')
export class CacheController {
  constructor(private readonly redisService: RedisService) {}

  @Get('health')
  health(): Promise<string> {
    return this.redisService.ping();
  }

  @Put(':key')
  async setCache(@Param('key') key: string): Promise<{ key: string; value: object }> {
    const value = { message: 'Valor guardado en Redis', createdAt: new Date().toISOString() };
    await this.redisService.set(key, value, 60);
    return { key, value };
  }

  @Get(':key')
  async getCache(@Param('key') key: string): Promise<{ key: string; value: object | null }> {
    const value = await this.redisService.get<object>(key);
    return { key, value };
  }

  @Delete(':key')
  async deleteCache(@Param('key') key: string): Promise<{ deleted: boolean }> {
    await this.redisService.del(key);
    return { deleted: true };
  }
}
