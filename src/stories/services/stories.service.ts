import { Injectable } from '@nestjs/common';
import { UserDto } from '../../libs/dtos/user.dto';
import { PrismaService } from '../../prisma/services/prisma.service';
import { GetCommentDto, GetCommentResponseDto } from '../dtos/get-comment.dto';
import {
  CreateStoryDto,
  CreateStoryResponseDto,
} from '../dtos/create-story.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';
import { errors } from '../../libs/errors';
import {
  CreateCommentDto,
  CreateCommentResponseDto,
} from '../dtos/create-comment.dto';
import { CreateLikeDto } from '../dtos/create-like.dto';
import { GetStoryDto, GetStoryResponseDto } from '../dtos/get-story.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Get Stories
   */
  async getStories(
    { id }: UserDto,
    { limit, nextPageToken }: GetStoryDto,
  ): Promise<GetStoryResponseDto[]> {
    // 스토리 ID 목록 조회
    const storyIds = await this.prismaService.$queryRaw<{ id: number }[]>`
        SELECT story.id
        FROM story
                 LEFT JOIN friend ON story.userId = friend.friendId
            AND friend.userId = ${id}
            AND isFriend = true
        WHERE (${nextPageToken ? Prisma.sql`story.id < ${nextPageToken} AND` : Prisma.empty} 
                (friend.userId = ${id} OR story.userId = ${id}))
        ORDER BY story.id DESC
            LIMIT ${limit};`;

    // 스토리 정보 조회
    const stories = await this.prismaService.stories.findMany({
      where: {
        id: { in: storyIds.map(({ id }) => id) },
      },
      include: {
        likes: {
          where: { userId: id },
          select: { createdAt: true },
        },
        comments: {
          select: {
            id: true,
            userId: true,
            content: true,
            createdAt: true,
          },
          orderBy: { id: 'desc' },
          take: 3,
        },
      },
      orderBy: { id: 'desc' },
    });
    return stories.map(({ likes, ...story }) => {
      return { ...story, liked: likes.length === 1 };
    });
  }

  /**
   * Create Story
   */
  async createStory(
    { id }: UserDto,
    { imageUrl, content }: CreateStoryDto,
  ): Promise<CreateStoryResponseDto> {
    // DB 저장
    const story = await this.prismaService.stories.create({
      data: { userId: id, imageUrl, content },
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

  /**
   * Get Story Comments
   */
  async getStoryComments(
    { id }: UserDto,
    { storyId, limit, nextPageToken, prevPageToken }: GetCommentDto,
  ): Promise<GetCommentResponseDto[]> {
    // 댓글 조회
    return this.prismaService.comments.findMany({
      where: {
        storyId,
        ...(nextPageToken ? { id: { lt: +nextPageToken } } : null),
        ...(prevPageToken ? { id: { gt: prevPageToken } } : null),
      },
      select: {
        id: true,
        userId: true,
        content: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
      take: limit,
    });
  }

  /**
   * Create Story Comment
   */
  async createStoryComment(
    { id }: UserDto,
    { storyId, content }: CreateCommentDto,
  ): Promise<CreateCommentResponseDto> {
    // 댓글 등록 트랜잭션
    const comment = await this.prismaService.$transaction(async (prisma) => {
      // 댓글 개수 업데이트
      await prisma.stories.updateMany({
        where: { id: storyId },
        data: {
          commentCount: { increment: 1 },
        },
      });

      // 댓글 등록
      return prisma.comments.create({
        data: { storyId, userId: id, content },
        select: { id: true },
      });
    });
    return { commentId: comment.id };
  }

  /**
   * Delete Comment
   */
  async deleteComment({ id }: UserDto, commentId: number): Promise<SuccessDto> {
    // User가 업로드한 댓글인지 체크
    const comment = await this.prismaService.comments.findUnique({
      where: { id: commentId },
      select: { storyId: true, userId: true },
    });
    if (comment.userId !== id) {
      throw errors.NoPermission();
    }

    // 댓글 삭제 트랜잭션
    await this.prismaService.$transaction(async (prisma) => {
      // 댓글 개수 업데이트
      await prisma.stories.updateMany({
        where: { id: comment.storyId },
        data: {
          commentCount: { decrement: 1 },
        },
      });

      // 댓글 등록
      await prisma.comments.deleteMany({
        where: { id: commentId },
      });
    });
    return { success: true };
  }

  /**
   * Create Story Like
   */
  async createStoryLike(
    { id }: UserDto,
    { storyId }: CreateLikeDto,
  ): Promise<SuccessDto> {
    // 좋아요 여부 체크
    const like = await this.prismaService.likes.findFirst({
      where: { storyId, userId: id },
    });
    if (like) {
      throw errors.InvalidRequest();
    }

    // 좋아요 등록 트랜잭션
    await this.prismaService.$transaction(async (prisma) => {
      // 좋아요 수 증가
      await prisma.stories.updateMany({
        where: { id: storyId },
        data: {
          likeCount: { increment: 1 },
        },
      });

      // 좋아요 등록
      await prisma.likes.createMany({
        data: { storyId, userId: id },
      });
    });
    return { success: true };
  }

  /**
   * Delete Story Like
   */
  async deleteStoryLike({ id }: UserDto, storyId: number): Promise<SuccessDto> {
    // 좋아요 여부 체크
    const like = await this.prismaService.likes.findFirst({
      where: { storyId, userId: id },
    });
    if (!like) {
      throw errors.InvalidRequest();
    }

    // 좋아요 삭제 트랜잭션
    await this.prismaService.$transaction(async (prisma) => {
      // 좋아요 수 증가
      await prisma.stories.updateMany({
        where: { id: storyId },
        data: {
          likeCount: { decrement: 1 },
        },
      });

      // 좋아요 등록
      await prisma.likes.deleteMany({
        where: { storyId, userId: id },
      });
    });
    return { success: true };
  }
}
