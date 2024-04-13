import { IsArray } from 'class-validator';

export class CreateRoomDto {
  @IsArray()
  friendIds: number[];
}

export class CreateRoomResponseDto {
  roomId: string;
}
