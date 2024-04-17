import { IsString } from 'class-validator';

export class GetStoryDto {
  @IsString()
  friendId: string;
}

export class GetStoryResponseDto {
  id: number;
  userId: string;
  imageUrl: string;
  createdAt: Date;
}
