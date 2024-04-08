import { Global, Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { RedisModule } from '@nestjs-modules/ioredis';

@Global()
@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: `redis://localhost:6379`,
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
