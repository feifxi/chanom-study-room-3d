import { request } from 'node:https';
import { All, Controller, NotFoundException, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import { StorageService } from './storage.service.js';

/** Response headers worth passing back to the browser */
const PASS_BACK = ['content-type', 'content-length', 'etag', 'last-modified'];

/**
 * Local development only (it answers 404 unless AWS_ENDPOINT_URL is set): forwards a browser's
 * signed S3 request to the AWS Emulator without the browser's own headers, because the emulator
 * refuses browser requests from another site (https://github.com/aws/aws-emulator/issues/26). The
 * signed link is the permission, as it is with S3, so it needs no sign-in. Delete this once the
 * emulator lets browsers in; production links go straight to S3.
 */
@ApiExcludeController()
@AllowAnonymous()
@Controller('dev-storage')
export class DevStorageController {
  constructor(private readonly storage: StorageService) {}

  @All('*path')
  pass(@Req() req: Request, @Res() res: Response) {
    const target = this.storage.devTarget(req.originalUrl.slice('/api/dev-storage'.length), req.method);
    if (!target) throw new NotFoundException();
    const headers: Record<string, string> = {};
    for (const name of ['content-type', 'content-length']) {
      const value = req.headers[name];
      if (typeof value === 'string') headers[name] = value;
    }
    const upstream = request(target.url, { method: req.method, headers, agent: target.agent }, (answer) => {
      res.status(answer.statusCode ?? 502);
      for (const name of PASS_BACK) {
        const value = answer.headers[name];
        if (value) res.setHeader(name, value);
      }
      answer.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.status(502).end();
    });
    req.pipe(upstream);
  }
}
