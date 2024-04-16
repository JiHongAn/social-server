import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLikeDto {
  @Type(() => Number)
  @IsNumber()
  storyId: number;
}
