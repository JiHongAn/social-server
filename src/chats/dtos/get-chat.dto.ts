import { PaginationDto } from '../../libs/dtos/pagination.dto';
import { IsString } from 'class-validator';

export class GetChatDto extends PaginationDto {
  @IsString()
  roomId: string;
}

export class GetChatResponseDto {
  chatId: number;
  userId: string;
  type: string;
  message: string;
  createdAt: Date;
}
