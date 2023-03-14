import { S3 } from 'aws-sdk';

export const s3 = new S3({
  region: `ap-southeast-1`,
});

export function getBucketName(): string {
  return `faas-wrapper-code`;
}
