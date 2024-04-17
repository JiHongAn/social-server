import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FriendsService } from '../services/friends.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../libs/decorators/get-user.decorator';
import { UserDto } from '../../libs/dtos/user.dto';
import { GetFriendDto, GetFriendResponseDto } from '../dtos/get-friend.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';
import { CreateRequestDto } from '../dtos/create-request.dto';
import { AcceptRequestDto } from '../dtos/accept-request.dto';
import {
  GetFriendStatusDto,
  GetFriendStatusResponseDto,
} from '../dtos/get-friend-status.dto';
import {
  GetFriendStoriesDto,
  GetFriendStoryResponseDto,
} from '../dtos/get-friend-stories.dto';
import { GetFriendRequestResponseDto } from '../dtos/get-friend-request.dto';
import { UpdateFriendStoryDto } from '../dtos/update-friend-story.dto';

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

  @Get('status')
  @UseGuards(JwtGuard)
  async getFriendStatus(
    @GetUser() user: UserDto,
    @Query() params: GetFriendStatusDto,
  ): Promise<GetFriendStatusResponseDto> {
    return this.friendsService.getFriendStatus(user, params);
  }

  @Get('stories')
  @UseGuards(JwtGuard)
  async getFriendStories(
    @GetUser() user: UserDto,
    @Query() params: GetFriendStoriesDto,
  ): Promise<GetFriendStoryResponseDto[]> {
    return this.friendsService.getFriendStories(user, params);
  }

  @Patch('stories')
  @UseGuards(JwtGuard)
  async updateFriendStories(
    @GetUser() user: UserDto,
    @Body() params: UpdateFriendStoryDto,
  ): Promise<SuccessDto> {
    return this.friendsService.updateFriendStories(user, params);
  }

  @Get('requests')
  @UseGuards(JwtGuard)
  async getFriendRequests(
    @GetUser() user: UserDto,
  ): Promise<GetFriendRequestResponseDto> {
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

  @Delete(':friendId')
  @UseGuards(JwtGuard)
  async deleteFriend(
    @GetUser() user: UserDto,
    @Param('friendId') friendId: string,
  ): Promise<SuccessDto> {
    return this.friendsService.deleteFriend(user, friendId);
  }
}
