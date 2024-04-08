import { Module } from '@nestjs/common';
import { ChatsService } from './services/chats.service';
import { ChatsController } from './controllers/chats.controller';
import { DynamooseModule } from 'nestjs-dynamoose';
import { ChatEntity } from './entities/chat.entity';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [
    DynamooseModule.forFeature([
      {
        name: 'Chat',
        schema: ChatEntity,
        options: { tableName: 'Chat' },
      },
    ]),
    RoomsModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
