import { PaginationDto } from '../../libs/dtos/pagination.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GetCommentDto extends PaginationDto {
  @Type(() => Number)
  @IsNumber()
  storyId: number;

  @IsOptional()
  @Type(() => Number)
  prevPageToken: number;
}

export class GetCommentResponseDto {
  id: number;
  userId: string;
  content: string;
  createdAt: Date;
}
