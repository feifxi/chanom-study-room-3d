import { redirect } from 'next/navigation';
import { MeSeed } from '@/features/account/MeSeed';
import { getMe } from '@/features/account/server';

/**
 * The signed-in app. Home's pages get the header (see HomeFrame); a room's page is its chat.
 * Only finished accounts get in: signed out, halfway through sign-up, or being deleted goes to
 * /login, which picks up at the right step. Checked on the server, so nothing flashes first.
 */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const me = await getMe();
  if (!me || !me.signedUp || me.deleteAt) redirect('/login');
  return <MeSeed me={me}>{children}</MeSeed>;
}
