export interface ChatKey {
  PK: string;
}

export interface Chat extends ChatKey {
  SK: number;
  type: string;
  userId: string;
  message: string;
  createdAt: Date;
}
