import { Agent } from 'node:https';
import { readFileSync } from 'node:fs';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import type { Env } from '../config/env.js';

/**
 * Settings for every AWS SDK client. In production only the region matters (credentials come from
 * the server's IAM role). Locally and in tests AWS_ENDPOINT_URL points at the AWS Emulator, which
 * serves HTTPS with its own certificate, so the client trusts that CA too.
 */
export function awsClientConfig(env: Pick<Env, 'AWS_REGION' | 'AWS_ENDPOINT_URL' | 'AWS_CA_BUNDLE'>) {
  if (!env.AWS_ENDPOINT_URL) return { region: env.AWS_REGION };
  return {
    region: env.AWS_REGION,
    endpoint: env.AWS_ENDPOINT_URL,
    // The emulator runs with request signing off; the SDK still wants something to sign with
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    ...(env.AWS_CA_BUNDLE && {
      requestHandler: new NodeHttpHandler({ httpsAgent: new Agent({ ca: readFileSync(env.AWS_CA_BUNDLE) }) }),
    }),
  };
}

/** S3 also needs the bucket in the path when it talks to the emulator. */
export function s3ClientConfig(env: Pick<Env, 'AWS_REGION' | 'AWS_ENDPOINT_URL' | 'AWS_CA_BUNDLE'>) {
  return { ...awsClientConfig(env), forcePathStyle: Boolean(env.AWS_ENDPOINT_URL) };
}
