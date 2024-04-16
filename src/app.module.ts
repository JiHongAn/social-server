import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { ChatsModule } from './chats/chats.module';
import { CacheModule } from './cache/cache.module';
import { DynamooseModule } from 'nestjs-dynamoose';
import { MembersModule } from './members/members.module';
import { FriendsModule } from './friends/friends.module';
import { StoriesModule } from './stories/stories.module';

@Module({
  imports: [
    DynamooseModule.forRoot(),
    AuthModule,
    PrismaModule,
    RoomsModule,
    ChatsModule,
    CacheModule,
    MembersModule,
    FriendsModule,
    StoriesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
