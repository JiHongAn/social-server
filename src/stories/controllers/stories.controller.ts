import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoriesService } from '../services/stories.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { GetUser } from '../../libs/decorators/get-user.decorator';
import { UserDto } from '../../libs/dtos/user.dto';
import { SuccessDto } from '../../libs/dtos/success.dto';
import { GetCommentDto, GetCommentResponseDto } from '../dtos/get-comment.dto';
import {
  CreateStoryDto,
  CreateStoryResponseDto,
} from '../dtos/create-story.dto';
import {
  CreateCommentDto,
  CreateCommentResponseDto,
} from '../dtos/create-comment.dto';
import { CreateLikeDto } from '../dtos/create-like.dto';
import { GetStoryDto, GetStoryResponseDto } from '../dtos/get-story.dto';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getStories(
    @GetUser() user: UserDto,
    @Query() params: GetStoryDto,
  ): Promise<GetStoryResponseDto[]> {
    return this.storiesService.getStories(user, params);
  }

  @Post()
  @UseGuards(JwtGuard)
  async createStory(
    @GetUser() user: UserDto,
    @Body() params: CreateStoryDto,
  ): Promise<CreateStoryResponseDto> {
    return this.storiesService.createStory(user, params);
  }

  @Delete(':storyId')
  @UseGuards(JwtGuard)
  async deleteStory(
    @GetUser() user: UserDto,
    @Param('storyId', ParseIntPipe) storyId: number,
  ): Promise<SuccessDto> {
    return this.storiesService.deleteStory(user, storyId);
  }

  @Get('comments')
  @UseGuards(JwtGuard)
  async getStoryComments(
    @GetUser() user: UserDto,
    @Query() params: GetCommentDto,
  ): Promise<GetCommentResponseDto[]> {
    return this.storiesService.getStoryComments(user, params);
  }

  @Post('comments')
  @UseGuards(JwtGuard)
  async createStoryComment(
    @GetUser() user: UserDto,
    @Body() params: CreateCommentDto,
  ): Promise<CreateCommentResponseDto> {
    return this.storiesService.createStoryComment(user, params);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtGuard)
  async deleteComment(
    @GetUser() user: UserDto,
    @Param('commentId', ParseIntPipe) commentId: number,
  ): Promise<SuccessDto> {
    return this.storiesService.deleteComment(user, commentId);
  }

  @Post('likes')
  @UseGuards(JwtGuard)
  async createStoryLike(
    @GetUser() user: UserDto,
    @Body() params: CreateLikeDto,
  ): Promise<SuccessDto> {
    return this.storiesService.createStoryLike(user, params);
  }

  @Delete('likes/:storyId')
  @UseGuards(JwtGuard)
  async deleteStoryLike(
    @GetUser() user: UserDto,
    @Param('storyId', ParseIntPipe) storyId: number,
  ): Promise<SuccessDto> {
    return this.storiesService.deleteStoryLike(user, storyId);
  }
}
