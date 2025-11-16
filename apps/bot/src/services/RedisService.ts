import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class RedisService {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriber = this.client.duplicate();
    this.publisher = this.client.duplicate();
  }

  async connect(): Promise<void> {
    await Promise.all([
      this.client.ping(),
      this.subscriber.ping(),
      this.publisher.ping(),
    ]);
    
    logger.info('Redis connected successfully');
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.client.quit(),
      this.subscriber.quit(),
      this.publisher.quit(),
    ]);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async incr(key: string, ttl?: number): Promise<number> {
    const value = await this.client.incr(key);
    if (ttl && value === 1) {
      await this.client.expire(key, ttl);
    }
    return value;
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(msg);
          callback(parsed);
        } catch (error) {
          logger.error('Failed to parse Redis message:', error);
        }
      }
    });
  }

  getClient(): Redis {
    return this.client;
  }
}