import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from '../services/rooms.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../libs/decorators/get-user.decorator';
import { UserDto } from '../../libs/dtos/user.dto';
import { CreateRoomDto, CreateRoomResponseDto } from '../dtos/create-room.dto';
import { GetRoomDto, GetRoomResponseDto } from '../dtos/get-room.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getRooms(
    @GetUser() user: UserDto,
    @Query() params: GetRoomDto,
  ): Promise<GetRoomResponseDto[]> {
    return this.roomsService.getRooms(user, params);
  }

  @Get(':roomId')
  @UseGuards(JwtGuard)
  async getRoom(
    @GetUser() user: UserDto,
    @Param('roomId') roomId: string,
  ): Promise<GetRoomResponseDto> {
    return this.roomsService.getRoom(user, roomId);
  }

  @Post()
  @UseGuards(JwtGuard)
  async createRoom(
    @GetUser() user: UserDto,
    @Body() params: CreateRoomDto,
  ): Promise<CreateRoomResponseDto> {
    return this.roomsService.createRoom(user, params);
  }
}
