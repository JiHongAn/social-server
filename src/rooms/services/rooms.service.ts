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
      const { lastChatId } = myMembers.find(({ roomId }) => {
        return roomId === room.id;
      });
      return {
        id: room.id,
        type: room.type,
        memberCount: room.memberCount,
        updatedAt: room.updatedAt,
        unread: room.lastChatId - lastChatId,
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
      unread: room.lastChatId - myMember.lastChatId,
      lastMessage: lastChats[0]?.message,
      memberUserIds: room.members.map(({ userId }) => userId),
    };
  }

  /**
   * Create Room
   */
  async createRoom(
    { id }: UserDto,
    { friendIds }: CreateRoomDto,
  ): Promise<CreateRoomResponseDto> {
    // 채팅방 ID 생성
    let roomId: string;
    let type: string;

    // 개인 채팅인 경우
    if (friendIds.length === 1) {
      roomId = this.createPrivateRoomId([id, friendIds[0]]);
      type = RoomType.private;
    } else {
      roomId = uuid();
      type = RoomType.group;
    }

    // 채팅방 존재 여부 체크
    const room = await this.prismaService.rooms.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    // 이미 채팅방이 존재한다면
    if (room) {
      return { roomId };
    }

    // 채팅방 생성 트랜잭션
    await this.prismaService.$transaction(async (prisma): Promise<void> => {
      // 채팅방 생성
      await prisma.rooms.createMany({
        data: { id: roomId, type, memberCount: 2, updatedAt: `${Date.now()}` },
      });

      // 멤버 생성
      const data = friendIds.map((friendId) => {
        return { userId: friendId, roomId };
      });
      await prisma.members.createMany({
        data: [{ userId: id, roomId }, ...data],
      });
    });
    return { roomId };
  }

  /* Create Private Room Id */
  private createPrivateRoomId(userIds: string[]): string {
    return userIds.sort().join('-');
  }
}
