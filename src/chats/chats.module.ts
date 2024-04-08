import { Module } from '@nestjs/common';
import { ChatsService } from './services/chats.service';
import { ChatsController } from './controllers/chats.controller';
import { MembersModule } from '../members/members.module';
import { DynamooseModule } from 'nestjs-dynamoose';
import { ChatEntity } from './entities/chat.entity';
import { ChatsGateway } from './gateways/chats.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DynamooseModule.forFeature([
      {
        name: 'Chat',
        schema: ChatEntity,
        options: { tableName: 'Chat' },
      },
    ]),
    AuthModule,
    MembersModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway],
})
export class ChatsModule {}
