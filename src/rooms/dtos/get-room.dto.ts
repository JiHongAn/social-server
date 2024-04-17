import { PaginationDto } from '../../libs/dtos/pagination.dto';

export class GetRoomDto extends PaginationDto {}

export class GetRoomResponseDto {
  id: string;
  type: string;
  memberCount: number;
  updatedAt: string;
  unread: number;
  lastMessage: string;
  memberUserIds: string[];
}
