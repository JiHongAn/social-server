import { Module } from '@nestjs/common';
import { StoriesService } from './services/stories.service';
import { StoriesController } from './controllers/stories.controller';

@Module({
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
