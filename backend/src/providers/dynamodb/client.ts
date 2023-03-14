import { DynamoDB } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export const DB = new DynamoDB.DocumentClient({ region: `ap-southeast-1` });

export function wrapDAO(
  item: object,
  tableName: string,
): DocumentClient.PutItemInput {
  return {
    TableName: tableName,
    Item: item,
  };
}
