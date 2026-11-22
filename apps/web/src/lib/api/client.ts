import createClient from 'openapi-fetch';
import type { components, paths } from './schema';

/**
 * The typed API client, generated from the API's OpenAPI document (`pnpm api:client` after an API
 * change). Paths are relative: the browser only talks to its own origin, and /api is routed to the
 * API (a Next rewrite locally, nginx in production), so the session cookie just goes along.
 */
export const api = createClient<paths>({ baseUrl: '' });

export type Schemas = components['schemas'];
export type Me = Schemas['Me'];
export type HandleCheck = Schemas['HandleCheck'];
