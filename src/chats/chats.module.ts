import { Module } from '@nestjs/common';
import { ChatsService } from './services/chats.service';
import { ChatsController } from './controllers/chats.controller';
import { DynamooseModule } from 'nestjs-dynamoose';
import { ChatEntity } from './entities/chat.entity';
import { ChatsGateway } from './gateways/chats.gateway';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [
    AuthModule,
    MembersModule,
    DynamooseModule.forFeature([
      {
        name: 'Chat',
        schema: ChatEntity,
        options: { tableName: 'Chat' },
      },
    ]),
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway],
  exports: [ChatsService],
})
export class ChatsModule {}
