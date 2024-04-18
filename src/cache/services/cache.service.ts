import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async get(key: string): Promise<string> {
    return this.redis.get(key);
  }

  async set(
    key: string,
    value: string | number,
    milliseconds?: number,
  ): Promise<'OK'> {
    if (milliseconds) {
      return this.redis.set(key, value, 'PX', milliseconds);
    } else {
      return this.redis.set(key, value);
    }
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.redis.incrby(key, increment);
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  async sadd(key: string, members: string[]): Promise<number> {
    return this.redis.sadd(key, ...members);
  }

  async srem(key: string, member: string): Promise<number> {
    return this.redis.srem(key, member);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.redis.expire(key, seconds);
  }

  async exists(key: string): Promise<number> {
    return this.redis.exists(key);
  }
}
