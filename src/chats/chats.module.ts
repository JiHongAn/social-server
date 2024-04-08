import { Module } from '@nestjs/common';
import { ChatsService } from './services/chats.service';
import { ChatsController } from './controllers/chats.controller';
import { MembersModule } from '../members/members.module';
import { DynamooseModule } from 'nestjs-dynamoose';
import { ChatEntity } from './entities/chat.entity';

@Module({
  imports: [
    DynamooseModule.forFeature([
      {
        name: 'Chat',
        schema: ChatEntity,
        options: { tableName: 'Chat' },
      },
    ]),
    MembersModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
