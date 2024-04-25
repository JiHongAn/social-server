import { IsArray, IsEnum } from 'class-validator';
import { RoomType } from '../../libs/enums/room-type.enum';

export class CreateRoomDto {
  @IsArray()
  friendIds: string[];

  @IsEnum(RoomType)
  type: RoomType;
}

export class CreateRoomResponseDto {
  roomId: string;
}
