import { Schema } from 'dynamoose';

export const ChatEntity = new Schema({
  PK: {
    type: String,
    hashKey: true,
  },
  SK: {
    type: Number,
    rangeKey: true,
  },
  userId: {
    type: Number,
  },
  message: {
    type: String,
  },
  createdAt: {
    type: Date,
  },
});
