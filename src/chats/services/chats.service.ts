import { Injectable } from '@nestjs/common';
import { UserDto } from '../../libs/dtos/user.dto';
import { GetChatDto, GetChatResponseDto } from '../dtos/get-chat.dto';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { Chat, ChatKey } from '../interfaces/chat.interface';
import { CreateChatDto } from '../dtos/create-chat.dto';
import { SortOrder } from 'dynamoose/dist/General';
import { GetLastChatResponseDto } from '../dtos/get-last-chat.dto';
import { MembersService } from '../../members/services/members.service';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel('Chat')
    private chatModel: Model<Chat, ChatKey>,
    private readonly membersService: MembersService,
  ) {}

  /**
   * Get Chats
   */
  async getChats(
    { id }: UserDto,
    { roomId, limit, nextPageToken }: GetChatDto,
  ): Promise<GetChatResponseDto[]> {
    // 멤버 여부 체크
    await this.membersService.validateMember(roomId, id);

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
      .map(({ userId, type, message, createdAt }) => {
        return { type, userId, message, createdAt };
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
    roomId,
    chatId,
    type,
    message,
    userId,
    createdAt,
  }: CreateChatDto): Promise<void> {
    // 채팅 데이터 저장
    await this.chatModel.create({
      PK: roomId,
      SK: chatId,
      userId,
      type,
      message,
      createdAt,
    });
  }

  /* 마지막 채팅 ID 조회 */
  async getLastChatId(roomId: string): Promise<number> {
    const chats = await this.chatModel
      .query('PK')
      .eq(roomId)
      .limit(1)
      .sort(SortOrder.descending)
      .exec();
    console.log();
    return chats[0]?.SK ?? 0;
  }
}
