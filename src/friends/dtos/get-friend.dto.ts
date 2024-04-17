import { PaginationDto } from '../../libs/dtos/pagination.dto';

export class GetFriendDto extends PaginationDto {}

export class GetFriendResponseDto {
  friendIds: string[];
}
