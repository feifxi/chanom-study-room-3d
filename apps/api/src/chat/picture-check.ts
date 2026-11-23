import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { SettingsService } from '../settings/settings.service.js';

const ENDPOINT = 'https://api.openai.com/v1/moderations';

/**
 * The picture check (feature 14): OpenAI's moderation endpoint, free to use, judges each chat
 * picture before it shows. Off until OPENAI_API_KEY is set. If OpenAI can't be reached the worker
 * tries again, and a picture is never shown unchecked while the key is set.
 */
@Injectable()
export class PictureCheck {
  private readonly log = new Logger(PictureCheck.name);
  private readonly key: string | undefined;

  constructor(
    config: ConfigService<Env, true>,
    private readonly settings: SettingsService,
  ) {
    this.key = config.get('OPENAI_API_KEY', { infer: true });
    if (!this.key) this.log.log('No OPENAI_API_KEY: chat pictures aren’t checked');
  }

  /** Whether the OpenAI key is set (the admin site shows it) */
  get configured(): boolean {
    return !!this.key;
  }

  /** Whether OpenAI flags the picture (sexual, violent, self-harm…); false when the check is off */
  async flagged(webp: Buffer): Promise<boolean> {
    // No key, or switched off on the admin site
    if (!this.key || !this.settings.get().pictureCheck) return false;
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [{ type: 'image_url', image_url: { url: `data:image/webp;base64,${webp.toString('base64')}` } }],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI moderation: ${res.status}`);
    const body = (await res.json()) as { results: { flagged: boolean; categories: Record<string, boolean> }[] };
    const result = body.results[0];
    if (result?.flagged) {
      const why = Object.entries(result.categories)
        .filter(([, on]) => on)
        .map(([c]) => c);
      this.log.warn(`Picture flagged: ${why.join(', ')}`);
    }
    return result?.flagged ?? false;
  }
}
