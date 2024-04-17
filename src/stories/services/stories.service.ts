import { Injectable } from '@nestjs/common';
import { UserDto } from '../../libs/dtos/user.dto';
import { PrismaService } from '../../prisma/services/prisma.service';
import {
  CreateStoryDto,
  CreateStoryResponseDto,
} from '../dtos/create-story.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';
import { errors } from '../../libs/errors';
import { GetStoryDto, GetStoryResponseDto } from '../dtos/get-story.dto';

@Injectable()
export class StoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Get Stories
   */
  async getStories(
    { id }: UserDto,
    { friendId }: GetStoryDto,
  ): Promise<GetStoryResponseDto[]> {
    if (friendId !== id) {
      // 친구 여부 확인
      const friend = await this.prismaService.friends.findFirst({
        where: { userId: id, friendId, isFriend: true },
      });
      if (!friend) {
        throw errors.NoPermission();
      }
    }

    // 조회 시작 시점
    const viewStartAt = new Date();
    viewStartAt.setUTCDate(viewStartAt.getUTCDate() - 1);

    // 스토리 조회
    return this.prismaService.stories.findMany({
      where: {
        userId: friendId,
        createdAt: { gte: viewStartAt },
      },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Create Story
   */
  async createStory(
    { id }: UserDto,
    { imageUrl }: CreateStoryDto,
  ): Promise<CreateStoryResponseDto> {
    // DB 저장
    const story = await this.prismaService.stories.create({
      data: { userId: id, imageUrl },
      select: { id: true },
    });
    return { storyId: story.id };
  }

  /**
   * Delete Story
   */
  async deleteStory({ id }: UserDto, storyId: number): Promise<SuccessDto> {
    // 내가 올린 스토리인지 확인
    const story = await this.prismaService.stories.findUnique({
      where: { id: storyId },
      select: { userId: true },
    });
    if (story.userId !== id) {
      throw errors.NoPermission();
    }

    // 스토리 삭제
    await this.prismaService.stories.deleteMany({
      where: { id: storyId },
    });
    return { success: true };
  }
}
