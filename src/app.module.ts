import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { ChatsModule } from './chats/chats.module';
import { MembersModule } from './members/members.module';

@Module({
  imports: [AuthModule, PrismaModule, RoomsModule, ChatsModule, MembersModule],
  controllers: [AppController],
})
export class AppModule {}
