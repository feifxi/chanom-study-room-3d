import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { DEFAULT_SETTINGS } from '@connecta/shared';
import { PictureCheck } from './picture-check.js';
import type { SettingsService } from '../settings/settings.service.js';

const config = (key?: string) => ({ get: () => key }) as unknown as ConfigService<never, true>;
const settings = (pictureCheck = true) => ({ get: () => ({ ...DEFAULT_SETTINGS, pictureCheck }) }) as unknown as SettingsService;

describe('the picture check', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is off without a key: nothing is sent, nothing flagged', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await new PictureCheck(config(), settings()).flagged(Buffer.from('x'))).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is off when the team switches it off on the admin site', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await new PictureCheck(config('sk-test'), settings(false)).flagged(Buffer.from('x'))).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('asks OpenAI with the picture and follows its answer', async () => {
    const fetch = vi.fn(async () => Response.json({ results: [{ flagged: true, categories: { sexual: true, violence: false } }] }));
    vi.stubGlobal('fetch', fetch);
    expect(await new PictureCheck(config('sk-test'), settings()).flagged(Buffer.from('x'))).toBe(true);
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).input[0].image_url.url).toMatch(/^data:image\/webp;base64,/);
  });

  it('fails (so the worker tries again) when OpenAI answers with an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('busy', { status: 503 })),
    );
    await expect(new PictureCheck(config('sk-test'), settings()).flagged(Buffer.from('x'))).rejects.toThrow('503');
  });
});
