import { hc } from 'hono/client';
import type { AppType } from '@study/api';
import { API_URL } from './config';

/** Typed client for apps/api: paths, params and response bodies come from the server's routes. */
export const api = hc<AppType>(API_URL);
