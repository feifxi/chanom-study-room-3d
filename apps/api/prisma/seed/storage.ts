import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { s3ClientConfig } from '../../src/aws/aws-client-config.js';
import type { Env } from '../../src/config/env.js';

/** The files bucket in the AWS Emulator, which forgets everything when it restarts. */
export async function seedStorage(env: Env) {
  if (!env.AWS_ENDPOINT_URL) {
    console.log('Bucket: skipped (AWS_ENDPOINT_URL is not set)');
    return;
  }
  const s3 = new S3Client(s3ClientConfig(env));
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    console.log(`Bucket: ${env.S3_BUCKET} (already there)`);
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404) {
      console.warn(`Bucket: skipped, the AWS Emulator didn't answer (docker compose up -d?): ${(error as Error).message}`);
      return;
    }
    await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
    console.log(`Bucket: ${env.S3_BUCKET} (created)`);
  }
}
