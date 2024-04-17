import { IsNumber, IsString } from 'class-validator';

export class UpdateFriendStoryDto {
  @IsString()
  friendId: string;

  @IsNumber()
  lastReadStoryId: number;
}
