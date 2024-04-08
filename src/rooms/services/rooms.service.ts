import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';
import { UserDto } from '../../libs/dtos/user.dto';
import { CreateRoomDto, CreateRoomResponseDto } from '../dtos/create-room.dto';
import { RoomType } from '../../libs/enums/room-type.enum';
import { v4 as uuid } from 'uuid';
import { errors } from '../../libs/errors';

@Injectable()
export class RoomsService {
  constructor(private readonly prismaService: PrismaService) {}

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

  /* Create Private Room Id */
  private createPrivateRoomId(userIds: number[]): string {
    return userIds.sort((a, b) => a - b).join('-');
  }
}
