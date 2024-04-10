import { Injectable } from '@nestjs/common';
import { UserDto } from '../../libs/dtos/user.dto';
import { GetChatDto, GetChatResponseDto } from '../dtos/get-chat.dto';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { Chat, ChatKey } from '../interfaces/chat.interface';
import { CreateChatDto } from '../dtos/create-chat.dto';
import { SortOrder } from 'dynamoose/dist/General';
import { GetLastChatResponseDto } from '../dtos/get-last-chat.dto';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel('Chat')
    private chatModel: Model<Chat, ChatKey>,
  ) {}

  /**
   * Get Chats
   */
  async getChats(
    { id }: UserDto,
    { roomId, limit, nextPageToken }: GetChatDto,
  ): Promise<GetChatResponseDto[]> {
    // 채팅 목록 조회
    const query = this.chatModel
      .query('PK')
      .eq(roomId)
      .limit(limit)
      .sort(SortOrder.descending);

    // Next Page Token이 있다면
    if (nextPageToken) {
      query.where('SK').lt(+nextPageToken);
    }
    const chats = await query.exec();
    return chats
      .map(({ userId, message, createdAt }) => {
        return { userId, message, createdAt };
      })
      .reverse();
  }

  /* 채팅방 별 마지막 메시지 조회 */
  async getLastChats(roomIds: string[]): Promise<GetLastChatResponseDto[]> {
    const promises = roomIds.map(async (roomId) => {
      // 메시지 조회
      const message = await this.chatModel
        .query('PK')
        .eq(roomId)
        .sort(SortOrder.descending)
        .limit(1)
        .exec();

      return {
        roomId,
        message: message[0]?.message,
        createdAt: message[0]?.createdAt,
      };
    });
    return await Promise.all(promises);
  }

  /* 채팅 생성 */
  async createChat({
    chatId,
    message,
    userId,
    roomId,
    createdAt,
  }: CreateChatDto): Promise<void> {
    // 채팅 데이터 저장
    await this.chatModel.create({
      PK: roomId,
      SK: chatId,
      userId,
      message,
      createdAt,
    });
  }
}
