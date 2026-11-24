import { redirect } from 'next/navigation';
import { HomeFrame } from '@/components/app/AppFrame';
import { MeSeed } from '@/features/account/MeSeed';
import { getMe } from '@/features/account/server';

/**
 * Pages anyone can browse, signed in or not: Discover (Common rooms take anyone, and listed rooms
 * say "Sign up to join"). Same frame as Home's pages; guests get only Discover and Sign up in it.
 * Someone halfway through sign-up, or being deleted, still finishes at /login first.
 */
export default async function BrowseLayout({ children }: LayoutProps<'/'>) {
  const me = await getMe();
  if (me && !me.isGuest && (!me.signedUp || me.deleteAt)) redirect('/login');
  return (
    <MeSeed me={me}>
      <HomeFrame>{children}</HomeFrame>
    </MeSeed>
  );
}
