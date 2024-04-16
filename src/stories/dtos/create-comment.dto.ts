import { IsNumber, IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @IsNumber()
  storyId: number;

  @IsString()
  @Length(1, 100)
  content: string;
}

export class CreateCommentResponseDto {
  commentId: number;
}
