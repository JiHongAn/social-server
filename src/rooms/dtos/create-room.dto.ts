import { IsArray, IsEnum } from 'class-validator';
import { RoomType } from '../../libs/enums/room-type.enum';

export class CreateRoomDto {
  @IsArray()
  friendIds: number[];
}

export class CreateRoomResponseDto {
  roomId: string;
}
