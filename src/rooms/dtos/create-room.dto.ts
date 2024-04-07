import { IsEnum, IsNumber } from 'class-validator';
import { RoomType } from '../enums/room-type.enum';

export class CreateRoomDto {
  @IsEnum(RoomType)
  type: string;

  @IsNumber()
  friendId: number;
}

export class CreateRoomResponseDto {
  roomId: string;
}
