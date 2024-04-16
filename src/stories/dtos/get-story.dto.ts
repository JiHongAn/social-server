import { PaginationDto } from '../../libs/dtos/pagination.dto';

export class GetStoryDto extends PaginationDto {}

export class GetStoryResponseDto {
  id: number;
  userId: string;
  content: string;
  imageUrl: string;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
}
