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
import {
  CreateStoryDto,
  CreateStoryResponseDto,
} from '../dtos/create-story.dto';
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
}
