import { IsString } from 'class-validator';
import { PaginationDto } from '../../libs/dtos/pagination.dto';

export class GetMemberDto extends PaginationDto {
  @IsString()
  roomId: string;
}

export class GetMemberResponseDto {
  memberUserIds: string[];
}
