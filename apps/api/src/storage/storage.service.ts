import { readFileSync } from 'node:fs';
import { Agent } from 'node:https';
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { s3ClientConfig } from '../aws/aws-client-config.js';
import type { Env } from '../config/env.js';

/** Where the dev pass-through lives (see DevStorageController), as the browser sees it */
export const DEV_STORAGE_PATH = '/api/dev-storage';

/**
 * Files in S3 (the AWS Emulator locally). Browsers move the bytes themselves, through short-lived
 * links made here; the server only reads and writes what its jobs need. Tests swap in
 * `MemoryStorage`, so nothing else knows about buckets.
 */
@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly ca?: Buffer;

  constructor(config: ConfigService<Env, true>) {
    const env = {
      AWS_REGION: config.get('AWS_REGION', { infer: true }),
      AWS_ENDPOINT_URL: config.get('AWS_ENDPOINT_URL', { infer: true }),
      AWS_CA_BUNDLE: config.get('AWS_CA_BUNDLE', { infer: true }),
    };
    this.s3 = new S3Client(s3ClientConfig(env));
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.endpoint = env.AWS_ENDPOINT_URL?.replace(/\/$/, '');
    if (env.AWS_CA_BUNDLE) this.ca = readFileSync(env.AWS_CA_BUNDLE);
  }

  /** A link the browser PUTs one file to: this exact type and size, for five minutes. */
  async uploadUrl(key: string, contentType: string, bytes: number): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType, ContentLength: bytes });
    return this.forBrowser(await getSignedUrl(this.s3, command, { expiresIn: 5 * 60 }));
  }

  /** A link the browser can open the file at, for an hour. */
  async downloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return this.forBrowser(await getSignedUrl(this.s3, command, { expiresIn: 60 * 60 }));
  }

  async get(key: string): Promise<Buffer> {
    const out = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await out.Body!.transformToByteArray());
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async remove(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.s3.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
  }

  /**
   * Where the dev pass-through forwards a browser's request, or null if it mustn't: only locally,
   * only into our bucket, only reading and uploading.
   */
  devTarget(pathAndQuery: string, method: string): { url: string; agent?: Agent } | null {
    if (!this.endpoint || !['GET', 'HEAD', 'PUT'].includes(method)) return null;
    if (!pathAndQuery.startsWith(`/${this.bucket}/`) || pathAndQuery.includes('..')) return null;
    return { url: this.endpoint + pathAndQuery, agent: this.ca && new Agent({ ca: this.ca }) };
  }

  /**
   * In production the link goes straight to S3. Locally it goes through the API's pass-through:
   * the AWS Emulator refuses every request a browser sends from another site, even with bucket
   * CORS set (https://github.com/aws/aws-emulator/issues/26). Remove when that's fixed.
   */
  private forBrowser(signed: string): string {
    if (!this.endpoint) return signed;
    const url = new URL(signed);
    return `${DEV_STORAGE_PATH}${url.pathname}${url.search}`;
  }
}
