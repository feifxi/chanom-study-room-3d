import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { createTransport } from 'nodemailer';
import { awsClientConfig } from '../aws/aws-client-config.js';
import type { Env } from '../config/env.js';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends email. Locally it goes over SMTP to Mailpit (read it at http://localhost:8025); in
 * production through Amazon SES's API, which signs in with the server's IAM role (SES's SMTP
 * interface would need long-lived keys).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly send: (mail: Mail) => Promise<void>;

  constructor(config: ConfigService<Env, true>) {
    this.from = config.get('MAIL_FROM', { infer: true });
    if (config.get('MAIL_DRIVER', { infer: true }) === 'ses') {
      const ses = new SESv2Client(
        awsClientConfig({
          AWS_REGION: config.get('AWS_REGION', { infer: true }),
          AWS_ENDPOINT_URL: config.get('AWS_ENDPOINT_URL', { infer: true }),
          AWS_CA_BUNDLE: config.get('AWS_CA_BUNDLE', { infer: true }),
        }),
      );
      this.send = async (mail) => {
        await ses.send(
          new SendEmailCommand({
            FromEmailAddress: this.from,
            Destination: { ToAddresses: [mail.to] },
            Content: {
              Simple: {
                Subject: { Data: mail.subject, Charset: 'UTF-8' },
                Body: { Text: { Data: mail.text, Charset: 'UTF-8' }, Html: { Data: mail.html, Charset: 'UTF-8' } },
              },
            },
          }),
        );
      };
    } else {
      const smtp = createTransport(config.get('SMTP_URL', { infer: true }));
      this.send = async (mail) => {
        await smtp.sendMail({ from: this.from, ...mail });
      };
    }
  }

  async deliver(mail: Mail): Promise<void> {
    await this.send(mail);
    this.logger.debug(`Sent "${mail.subject}"`);
  }
}
