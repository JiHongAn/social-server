import { IsArray } from 'class-validator';

export class CreateRoomDto {
  @IsArray()
  friendIds: string[];
}

export class CreateRoomResponseDto {
  roomId: string;
}
