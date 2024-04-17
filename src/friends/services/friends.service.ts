import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';
import { UserDto } from '../../libs/dtos/user.dto';
import { GetFriendDto, GetFriendResponseDto } from '../dtos/get-friend.dto';
import { CreateRequestDto } from '../dtos/create-request.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';
import { errors } from '../../libs/errors';
import { AcceptRequestDto } from '../dtos/accept-request.dto';
import {
  GetFriendStatusDto,
  GetFriendStatusResponseDto,
} from '../dtos/get-friend-status.dto';
import { FriendStatus } from '../enums/friend-status.enum';
import {
  GetFriendStoriesDto,
  GetFriendStoryResponseDto,
} from '../dtos/get-friend-stories.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FriendsService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Get Friends
   */
  async getFriends(
    { id }: UserDto,
    { limit, nextPageToken }: GetFriendDto,
  ): Promise<GetFriendResponseDto> {
    const friends = await this.prismaService.friends.findMany({
      where: { userId: id, isFriend: true },
      select: { friendId: true },
      orderBy: { friendId: 'desc' },
      skip: nextPageToken ? 1 : 0,
      ...(nextPageToken && {
        cursor: { userId_friendId: { userId: id, friendId: nextPageToken } },
      }),
      take: limit,
    });
    return { friendIds: friends.map(({ friendId }) => friendId) };
  }

  /**
   * Get Friend Status
   */
  async getFriendStatus(
    { id }: UserDto,
    { friendId }: GetFriendStatusDto,
  ): Promise<GetFriendStatusResponseDto> {
    const friend = await this.prismaService.friends.findFirst({
      where: {
        OR: [
          { userId: id, friendId },
          { userId: friendId, friendId: id },
        ],
      },
    });

    // 친구 상태
    let status: FriendStatus;
    if (!friend) {
      status = FriendStatus.None;
    } else if (friend.isFriend) {
      status = FriendStatus.Friend;
    } else if (friend.userId === id) {
      status = FriendStatus.NotAccept;
    } else {
      status = FriendStatus.Send;
    }
    return { status };
  }

  /**
   * Get Friend Stories
   */
  async getFriendStories(
    { id }: UserDto,
    { limit, nextPageToken }: GetFriendStoriesDto,
  ): Promise<GetFriendStoryResponseDto[]> {
    // 조회 시작 시점
    const viewStartAt = new Date();
    viewStartAt.setUTCDate(viewStartAt.getUTCDate() - 1);

    // 스토리를 업로드한 친구 목록 조회
    return this.prismaService.$queryRaw<
      { userId: string; lastStoryId: number }[]
    >`SELECT story.userId, MAX(story.id) AS lastStoryId
      FROM story
               INNER JOIN friend ON story.userId = friend.friendId
      WHERE friend.userId = ${id}
        AND friend.isFriend = TRUE
        AND story.createdAt >= ${viewStartAt}
      ${nextPageToken ? Prisma.sql`AND story.id < ${+nextPageToken}` : Prisma.empty}
      GROUP BY story.userId
      ORDER BY MAX(story.id) DESC
          LIMIT ${limit};`;
  }

  /**
   * Get Friend Requests
   */
  async getFriendRequests({ id }: UserDto): Promise<GetFriendResponseDto> {
    const friendRequests = await this.prismaService.friends.findMany({
      where: { userId: id, isFriend: false },
      select: { friendId: true },
    });
    return { friendIds: friendRequests.map(({ friendId }) => friendId) };
  }

  /**
   * Create Friend Request
   */
  async createFriendRequest(
    { id }: UserDto,
    { friendId }: CreateRequestDto,
  ): Promise<SuccessDto> {
    // 나에게 친구 요청을 보낸 경우
    if (id === friendId) {
      throw errors.InvalidRequest();
    }

    // 친구 요청을 보낸 경우
    const friendRequested = await this.prismaService.friends.findFirst({
      where: { userId: id, friendId },
    });
    if (friendRequested) {
      throw errors.InvalidRequest();
    }

    // 친구 요청 전송
    await this.prismaService.friends.createMany({
      data: { userId: friendId, friendId: id, isFriend: false },
    });
    return { success: true };
  }

  /**
   * Friend Request Accept
   */
  async friendRequestAccept(
    { id }: UserDto,
    { friendId }: AcceptRequestDto,
  ): Promise<SuccessDto> {
    // 친구 요청 여부
    const friendRequested = await this.prismaService.friends.findFirst({
      where: { userId: id, friendId, isFriend: false },
    });

    // 친구 요청이 없거나 이미 친구인 경우
    if (!friendRequested || friendRequested.isFriend) {
      throw errors.InvalidRequest();
    }

    // 친구 수락
    await this.prismaService.$transaction(async (prisma) => {
      await prisma.friends.updateMany({
        where: { userId: id, friendId },
        data: { isFriend: true },
      });
      await prisma.friends.createMany({
        data: { userId: friendId, friendId: id, isFriend: true },
      });
    });
    return { success: true };
  }
}
