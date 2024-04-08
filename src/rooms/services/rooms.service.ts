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

@Injectable()
export class RoomsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create Room
   */
  async createRoom(
    { id }: UserDto,
    { type, friendId }: CreateRoomDto,
  ): Promise<CreateRoomResponseDto> {
    // 채팅방 ID 생성
    const roomId =
      type === RoomType.group
        ? uuid()
        : this.createPrivateRoomId([id, friendId]);

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
      await prisma.members.createMany({
        data: [
          { userId: id, roomId },
          { userId: friendId, roomId },
        ],
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
    const room = await this.prismaService.rooms.findUnique({
      where: { id: roomId },
      select: { type: true, memberCount: true },
    });
    if (room.type !== RoomType.group) {
      throw errors.InvalidRequest();
    }

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
    const room = await this.prismaService.rooms.findUnique({
      where: { id: roomId },
      select: { type: true, memberCount: true },
    });
    if (room.type !== RoomType.group) {
      throw errors.InvalidRequest();
    }

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

  /* 마지막으로 조회한 채팅 ID 업데이트 */
  async updateMemberLastChatId(roomId: string, userId: number): Promise<void> {
    const lastChatId = await this.getRoomLastChatId(roomId);

    // 멤버가 읽은 마지막 채팅 ID 업데이트
    await this.prismaService.members.updateMany({
      where: { userId, roomId },
      data: { lastChatId },
    });
  }

  /* 채팅방의 마지막 Chat Id 조회 */
  async getRoomLastChatId(roomId: string): Promise<number> {
    // 캐싱된 lastChatId 리턴
    const lastChatId = await this.cacheService.get(`chat:id:${roomId}`);
    if (lastChatId) {
      return +lastChatId;
    }

    // DB에서 조회
    const room = await this.prismaService.rooms.findUnique({
      where: { id: roomId },
      select: { lastChatId: true },
    });

    // 캐싱
    await this.cacheService.set(`chat:id:${roomId}`, room.lastChatId);
    return room.lastChatId;
  }

  /* 멤버들의 user ID 목록 조회 */
  async getMemberUserIds(roomId: string): Promise<string[]> {
    // 캐싱된 member들의 user ID 목록 리턴
    const memberUserIds = await this.cacheService.smembers(`members:${roomId}`);
    if (memberUserIds.length > 0) {
      return memberUserIds;
    }

    // DB에 저장된 member들의 userId 목록 리턴
    const members = await this.prismaService.members.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return members.map(({ userId }) => userId.toString());
  }

  /* Validate Member */
  async validateMember(roomId: string, userId: number): Promise<void> {
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

  /* Create Private Room Id */
  private createPrivateRoomId(userIds: number[]): string {
    return userIds.sort((a, b) => a - b).join('-');
  }
}
