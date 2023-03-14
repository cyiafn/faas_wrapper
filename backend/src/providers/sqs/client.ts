import { SQS } from 'aws-sdk';

export const sqsClient = new SQS({ region: `ap-southeast-1` });
