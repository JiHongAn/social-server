import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from '../services/members.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../libs/decorators/get-user.decorator';
import { UserDto } from '../../libs/dtos/user.dto';
import { InviteMemberDto } from '../dtos/invite-member.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

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
