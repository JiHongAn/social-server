import { Injectable } from '@nestjs/common';
import { UserDto } from '../../libs/dtos/user.dto';
import { GetChatDto, GetChatResponseDto } from '../dtos/get-chat.dto';
import { InjectModel, Model } from 'nestjs-dynamoose';
import { Chat, ChatKey } from '../interfaces/chat.interface';
import { CreateChatDto } from '../dtos/create-chat.dto';
import { RoomsService } from '../../rooms/services/rooms.service';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel('Chat')
    private chatModel: Model<Chat, ChatKey>,
    private readonly roomsService: RoomsService,
  ) {}

  /**
   * Get Chats
   */
  async getChats(
    { id }: UserDto,
    { roomId, limit, nextPageToken }: GetChatDto,
  ): Promise<GetChatResponseDto[]> {
    // 멤버 여부 체크
    await this.roomsService.validateMember(roomId, id);

    // 채팅 목록 조회
    const query = this.chatModel.query('PK').eq(roomId).limit(limit);

    // Next Page Token이 있다면
    if (nextPageToken) {
      query.where('SK').lt(+nextPageToken);
    }
    return query.exec();
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
