export interface ChatKey {
  PK: string;
}

export interface Chat extends ChatKey {
  SK: number;
  userId: number;
  message: string;
  createdAt: Date;
}
