import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType = createClient({
    socket: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  async onModuleInit(): Promise<void> {
    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });

    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (ttlSeconds) {
      await this.client.set(key, serialized, { EX: ttlSeconds });
      return;
    }

    await this.client.set(key, serialized);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
