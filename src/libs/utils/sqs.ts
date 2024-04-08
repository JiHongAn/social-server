import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { errors } from '../errors';

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
});

export const addFcmSQS = async (messageBody: string) => {
  const command = new SendMessageCommand({
    QueueUrl: process.env.FCM_QUEUE_URL,
    MessageBody: messageBody,
  });

  try {
    return sqsClient.send(command);
  } catch (e) {
    throw errors.InternalError();
  }
};
