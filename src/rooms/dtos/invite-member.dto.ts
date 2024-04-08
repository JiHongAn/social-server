import { IsNumber, IsString } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  roomId: string;

  @IsNumber()
  friendId: number;
}
