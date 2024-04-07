import { Module } from '@nestjs/common';
import { ChatsService } from './services/chats.service';
import { ChatsController } from './controllers/chats.controller';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
