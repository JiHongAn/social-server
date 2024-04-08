import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';
import { UserDto } from '../../libs/dtos/user.dto';
import { CreateRoomDto, CreateRoomResponseDto } from '../dtos/create-room.dto';
import { RoomType } from '../../libs/enums/room-type.enum';
import { v4 as uuid } from 'uuid';
import { errors } from '../../libs/errors';
import { InviteMemberDto } from '../dtos/invite-member.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';
import { CacheService } from '../../cache/services/cache.service';
import { GetRoomDto, GetRoomResponseDto } from '../dtos/get-room.dto';
import { ChatsService } from '../../chats/services/chats.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
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
          where: { userId: id },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: nextPageToken ? 1 : 0,
      ...(nextPageToken && { cursor: { id: nextPageToken } }),
      take: limit,
    });

    // 채팅방 ID 목록
    const lastChats = await this.chatsService.getLastChats(
      rooms.map(({ id }) => id),
    );

    // 마지막 메시지 조회
    return rooms.map((room) => {
      const { message, createdAt } = lastChats.find(
        ({ roomId }) => roomId === room.id,
      );

      // 읽지 않은 메시지 수
      const unread = room.lastChatId - room.members[0].lastChatId;

      return {
        id: room.id,
        type: room.type,
        memberCount: room.memberCount,
        updatedAt: room.updatedAt,
        unread,
        lastMessage: { message, createdAt },
      };
    });
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
      throw errors.InvalidRequest();
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

  /**
   * Invite Member
   */
  async inviteMember(
    { id }: UserDto,
    { roomId, friendId }: InviteMemberDto,
  ): Promise<SuccessDto> {
    // 멤버인지 체크
    await this.validateMember(roomId, id);

    // 그룹 채팅인지 체크
    await this.validateGroup(roomId);

    // 멤버 추가
    await this.prismaService.$transaction(async (prisma) => {
      // 멤버 수 증가
      const { memberCount } = await prisma.rooms.update({
        where: { id: roomId },
        data: {
          memberCount: { increment: 1 },
        },
        select: { memberCount: true },
      });

      // 그룹 채팅 정원은 100명
      if (memberCount > 99) {
        throw errors.InvalidRequest();
      }

      // 멤버 추가
      await prisma.members.createMany({
        data: { roomId, userId: friendId },
      });
    });
    return { success: true };
  }

  /**
   * Exit Member
   */
  async exitMember({ id }: UserDto, roomId: string): Promise<SuccessDto> {
    // 멤버인지 체크
    await this.validateMember(roomId, id);

    // 그룹 채팅인지 체크
    await this.validateGroup(roomId);

    // 멤버 퇴장 트랜잭션
    await this.prismaService.$transaction(async (prisma) => {
      // 멤버 수 감소
      const { memberCount } = await prisma.rooms.update({
        where: { id: roomId },
        data: {
          memberCount: { decrement: 1 },
        },
        select: { memberCount: true },
      });

      // 멤버 정보 삭제
      await prisma.members.deleteMany({
        where: { userId: id, roomId },
      });

      if (memberCount === 0) {
        await prisma.rooms.deleteMany({
          where: { id: roomId },
        });
      }
    });
    return { success: true };
  }

  /* Validate Member */
  private async validateMember(roomId: string, userId: number): Promise<void> {
    // 멤버 정보 조회
    const member = await this.prismaService.members.findFirst({
      where: { userId, roomId },
      select: { lastChatId: true },
    });

    // 멤버가 아니라면
    if (!member) {
      throw errors.NoPermission();
    }
  }

  /* Validate Group */
  private async validateGroup(roomId: string): Promise<void> {
    const room = await this.prismaService.rooms.findUnique({
      where: { id: roomId },
      select: { type: true, memberCount: true },
    });

    // 그룹 채팅이 아니라면
    if (room.type !== RoomType.group) {
      throw errors.InvalidRequest();
    }
  }

  /* Create Private Room Id */
  private createPrivateRoomId(userIds: number[]): string {
    return userIds.sort((a, b) => a - b).join('-');
  }
}
