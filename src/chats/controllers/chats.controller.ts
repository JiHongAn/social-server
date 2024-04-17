import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ChatsService } from '../services/chats.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../libs/decorators/get-user.decorator';
import { UserDto } from '../../libs/dtos/user.dto';
import { GetChatDto, GetChatResponseDto } from '../dtos/get-chat.dto';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getChats(
    @GetUser() user: UserDto,
    @Query() params: GetChatDto,
  ): Promise<GetChatResponseDto[]> {
    return this.chatsService.getChats(user, params);
  }
}
