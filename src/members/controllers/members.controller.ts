import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from '../services/members.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../libs/decorators/get-user.decorator';
import { UserDto } from '../../libs/dtos/user.dto';
import { InviteMemberDto } from '../dtos/invite-member.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';
import { GetMemberDto, GetMemberResponseDto } from '../dtos/get-member.dto';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getMembers(
    @GetUser() user: UserDto,
    @Query() params: GetMemberDto,
  ): Promise<GetMemberResponseDto> {
    return this.membersService.getMembers(user, params);
  }

  @Post()
  @UseGuards(JwtGuard)
  async inviteMember(
    @GetUser() user: UserDto,
    @Body() params: InviteMemberDto,
  ): Promise<SuccessDto> {
    return this.membersService.inviteMember(user, params);
  }

  @Delete(':roomId')
  async exitMember(
    @GetUser() user: UserDto,
    @Param('roomId') roomId: string,
  ): Promise<SuccessDto> {
    return this.membersService.exitMember(user, roomId);
  }
}
