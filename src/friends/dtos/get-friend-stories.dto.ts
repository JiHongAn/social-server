import { PaginationDto } from '../../libs/dtos/pagination.dto';

export class GetFriendStoriesDto extends PaginationDto {}

export class GetFriendStoryResponseDto {
  userId: string;
  lastStoryId: number;
}
