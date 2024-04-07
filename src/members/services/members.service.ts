import { Injectable } from '@nestjs/common';
import { errors } from '../../libs/errors';
import { PrismaService } from '../../prisma/services/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prismaService: PrismaService) {}

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
}
