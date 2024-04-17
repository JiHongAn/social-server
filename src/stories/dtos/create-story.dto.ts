import { IsString } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  imageUrl: string;
}

export class CreateStoryResponseDto {
  storyId: number;
}
