import { IsString, Length } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  imageUrl: string;

  @IsString()
  @Length(1, 500)
  content: string;
}

export class CreateStoryResponseDto {
  storyId: number;
}
