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
  type: {
    type: String,
  },
  userId: {
    type: String,
  },
  message: {
    type: String,
  },
  createdAt: {
    type: Date,
  },
});
