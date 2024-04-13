import { IsString } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  roomId: string;

  @IsString()
  friendId: string;
}
