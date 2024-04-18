import { Injectable } from '@nestjs/common';
import { UserDto } from '../../libs/dtos/user.dto';
import { InviteMemberDto } from '../dtos/invite-member.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';
import { errors } from '../../libs/errors';
import { PrismaService } from '../../prisma/services/prisma.service';
import { RoomType } from '../../libs/enums/room-type.enum';
import { GetMemberDto, GetMemberResponseDto } from '../dtos/get-member.dto';
import { CacheService } from '../../cache/services/cache.service';

@Injectable()
export class MembersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get Members
   */
  async getMembers(
    { id }: UserDto,
    { roomId, nextPageToken, limit }: GetMemberDto,
  ): Promise<GetMemberResponseDto> {
    // 권한 확인
    const myMember = await this.prismaService.members.findFirst({
      where: { roomId, userId: id },
    });
    if (!myMember) {
      throw errors.NoPermission();
    }

    // 멤버 조회
    const members = await this.prismaService.members.findMany({
      where: { roomId },
      select: { userId: true },
      orderBy: { userId: 'desc' },
      skip: nextPageToken ? 1 : 0,
      ...(nextPageToken && {
        cursor: { roomId_userId: { roomId, userId: nextPageToken } },
      }),
      take: limit,
    });
    return { memberUserIds: members.map(({ userId }) => userId) };
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

    // 멤버 캐싱
    const isMemberCached = await this.cacheService.exists(`members:${roomId}`);
    if (isMemberCached) {
      await this.cacheService.sadd(`members:${roomId}`, [id]);
    }
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

    // 멤버 캐싱 삭제
    const isMemberCached = await this.cacheService.exists(`members:${roomId}`);
    if (isMemberCached) {
      await this.cacheService.srem(`members:${roomId}`, id);
    }
    return { success: true };
  }

  /* Validate Member */
  async validateMember(roomId: string, userId: string): Promise<void> {
    // 멤버 정보 조회
    const member = await this.prismaService.members.findFirst({
      where: { userId, roomId },
      select: { lastReadChatId: true },
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
}
