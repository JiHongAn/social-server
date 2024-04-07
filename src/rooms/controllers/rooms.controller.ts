import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RoomsService } from '../services/rooms.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../libs/decorators/get-user.decorator';
import { UserDto } from '../../libs/dtos/user.dto';
import { CreateRoomDto, CreateRoomResponseDto } from '../dtos/create-room.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @UseGuards(JwtGuard)
  async createRoom(
    @GetUser() user: UserDto,
    @Body() params: CreateRoomDto,
  ): Promise<CreateRoomResponseDto> {
    return this.roomsService.createRoom(user, params);
  }
}
