export class CreateChatDto {
  roomId: string;
  chatId: number;
  userId: string;
  type: string;
  message: string;
  createdAt: Date;
}
