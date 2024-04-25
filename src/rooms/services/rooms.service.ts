import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';
import { UserDto } from '../../libs/dtos/user.dto';
import { CreateRoomDto, CreateRoomResponseDto } from '../dtos/create-room.dto';
import { RoomType } from '../../libs/enums/room-type.enum';
import { v4 as uuid } from 'uuid';
import { errors } from '../../libs/errors';
import { GetRoomDto, GetRoomResponseDto } from '../dtos/get-room.dto';
import { ChatsService } from '../../chats/services/chats.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly chatsService: ChatsService,
  ) {}

  /**
   * Get Rooms
   */
  async getRooms(
    { id }: UserDto,
    { limit, nextPageToken }: GetRoomDto,
  ): Promise<GetRoomResponseDto[]> {
    // 가입한 채팅방 조회
    const rooms = await this.prismaService.rooms.findMany({
      where: {
        members: {
          some: { userId: id },
        },
        lastChatId: { gte: 1 },
      },
      include: {
        members: {
          where: {
            userId: { not: id },
          },
          take: 3,
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: nextPageToken ? 1 : 0,
      ...(nextPageToken && { cursor: { id: nextPageToken } }),
      take: limit,
    });

    // 채팅방 ID 목록
    const roomIds = rooms.map(({ id }) => id);

    // 나의 멤버 정보
    const myMembers = await this.prismaService.members.findMany({
      where: {
        userId: id,
        roomId: { in: roomIds },
      },
    });

    // 채팅방 ID 목록
    const lastChats = await this.chatsService.getLastChats(
      rooms.map(({ id }) => id),
    );

    // 마지막 메시지 조회
    return rooms.map((room) => {
      // 마지막 전송된 메시지
      const { message } = lastChats.find(({ roomId }) => {
        return roomId === room.id;
      });

      // 나의 멤버 정보
      const { lastReadChatId } = myMembers.find(({ roomId }) => {
        return roomId === room.id;
      });
      return {
        id: room.id,
        type: room.type,
        memberCount: room.memberCount,
        updatedAt: room.updatedAt,
        unread: room.lastChatId - lastReadChatId,
        lastMessage: message,
        memberUserIds: room.members.map(({ userId }) => userId),
      };
    });
  }

  /**
   * Get Room
   */
  async getRoom({ id }: UserDto, roomId: string): Promise<GetRoomResponseDto> {
    // 가입한 채팅방 조회
    const room = await this.prismaService.rooms.findUnique({
      where: { id: roomId },
      include: {
        members: {
          where: {
            userId: { not: id },
          },
          take: 3,
        },
      },
    });

    if (!room) {
      throw errors.InvalidRequest();
    }

    // 나의 멤버 정보
    const myMember = await this.prismaService.members.findFirst({
      where: { userId: id, roomId },
    });

    // 채팅방 ID 목록
    const lastChats = await this.chatsService.getLastChats([roomId]);

    // 마지막 메시지 조회
    return {
      id: room.id,
      type: room.type,
      memberCount: room.memberCount,
      updatedAt: room.updatedAt,
      unread: room.lastChatId - myMember.lastReadChatId,
      lastMessage: lastChats[0]?.message,
      memberUserIds: room.members.map(({ userId }) => userId),
    };
  }

  /**
   * Create Room
   */
  async createRoom(
    { id }: UserDto,
    { friendIds, type }: CreateRoomDto,
  ): Promise<CreateRoomResponseDto> {
    // 개인 채팅방의 경우 친구는 1명까지
    if (type === RoomType.private) {
      await this.validateCreatePrivateRoom(id, friendIds);
    }

    // 채팅방 ID 생성
    const roomId = uuid();

    // 멤버 데이터
    const members = friendIds.map((friendId) => {
      return { userId: friendId, roomId };
    });

    // 멤버 수
    const memberCount = members.length + 1;

    // 채팅방 생성
    await this.prismaService.$transaction(async (prisma): Promise<void> => {
      // 채팅방 생성
      await prisma.rooms.createMany({
        data: { id: roomId, memberCount, type, updatedAt: `${Date.now()}` },
      });

      // 멤버 생성
      await prisma.members.createMany({
        data: [{ userId: id, roomId }, ...members],
      });

      // 개인 채팅의 경우 친구 정보 업데이트
      if (type === RoomType.private) {
        await prisma.friends.updateMany({
          where: { userId: id, friendId: friendIds[0], isFriend: true },
          data: { privateRoomId: roomId },
        });
        await prisma.friends.updateMany({
          where: { userId: friendIds[0], friendId: id, isFriend: true },
          data: { privateRoomId: roomId },
        });
      }
    });
    return { roomId };
  }

  /* 개인 채팅방 생성 가능 여부 체크 */
  private async validateCreatePrivateRoom(
    userId: string,
    friendIds: string[],
  ): Promise<void> {
    // 친구가 2명 이상이라면
    if (friendIds.length >= 2) {
      throw errors.InvalidRequest();
    }

    // 개인 채팅방이 있는지 확인
    const friend = await this.prismaService.friends.findFirst({
      where: { userId, friendId: friendIds[0], isFriend: true },
      select: { privateRoomId: true },
    });

    // 친구가 아니거나 개인 채팅방이 있다면
    if (!friend || friend.privateRoomId) {
      throw errors.InvalidRequest();
    }
  }
}
