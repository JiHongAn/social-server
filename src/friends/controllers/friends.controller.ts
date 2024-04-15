import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FriendsService } from '../services/friends.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../libs/decorators/get-user.decorator';
import { UserDto } from '../../libs/dtos/user.dto';
import { GetFriendDto, GetFriendResponseDto } from '../dtos/get-friend.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';
import { CreateRequestDto } from '../dtos/create-request.dto';
import { AcceptRequestDto } from '../dtos/accept-request.dto';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getFriends(
    @GetUser() user: UserDto,
    @Query() params: GetFriendDto,
  ): Promise<GetFriendResponseDto> {
    return this.friendsService.getFriends(user, params);
  }

  @Get('requests')
  @UseGuards(JwtGuard)
  async getFriendRequests(
    @GetUser() user: UserDto,
  ): Promise<GetFriendResponseDto> {
    return this.friendsService.getFriendRequests(user);
  }

  @Post('requests')
  @UseGuards(JwtGuard)
  async createFriendRequest(
    @GetUser() user: UserDto,
    @Body() params: CreateRequestDto,
  ): Promise<SuccessDto> {
    return this.friendsService.createFriendRequest(user, params);
  }

  @Post('accepts')
  @UseGuards(JwtGuard)
  async friendRequestAccept(
    @GetUser() user: UserDto,
    @Body() params: AcceptRequestDto,
  ): Promise<SuccessDto> {
    return this.friendsService.friendRequestAccept(user, params);
  }
}
