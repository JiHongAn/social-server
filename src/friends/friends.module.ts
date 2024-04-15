import { Module } from '@nestjs/common';
import { FriendsService } from './services/friends.service';
import { FriendsController } from './controllers/friends.controller';

@Module({
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
