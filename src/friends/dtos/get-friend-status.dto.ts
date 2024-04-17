import { IsString } from 'class-validator';
import { FriendStatus } from '../enums/friend-status.enum';

export class GetFriendStatusDto {
  @IsString()
  friendId: string;
}

export class GetFriendStatusResponseDto {
  status: FriendStatus;
}
