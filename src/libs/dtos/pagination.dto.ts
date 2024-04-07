import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PaginationDto {
  @Type(() => Number)
  @IsNumber()
  limit: number;

  @IsString()
  @IsOptional()
  nextPageToken?: string;
}
