import { anonymousClient, emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Signing in and out (Better Auth, served by the API under /api/auth on this origin). */
export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [emailOTPClient(), anonymousClient()],
});
