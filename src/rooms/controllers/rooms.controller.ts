import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from '../services/rooms.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../libs/decorators/get-user.decorator';
import { UserDto } from '../../libs/dtos/user.dto';
import { CreateRoomDto, CreateRoomResponseDto } from '../dtos/create-room.dto';
import { InviteMemberDto } from '../dtos/invite-member.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';

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

  @Post('members')
  @UseGuards(JwtGuard)
  async inviteMember(
    @GetUser() user: UserDto,
    @Body() params: InviteMemberDto,
  ): Promise<SuccessDto> {
    return this.roomsService.inviteMember(user, params);
  }

  @Delete('members:roomId')
  async exitMember(
    @GetUser() user: UserDto,
    @Param('roomId') roomId: string,
  ): Promise<SuccessDto> {
    return this.roomsService.exitMember(user, roomId);
  }
}
