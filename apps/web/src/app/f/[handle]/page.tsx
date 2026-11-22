import { FriendLinkPage } from '@/features/friends/FriendLinkPage';

/** Someone's friend link (connecta.app/f/<handle>): opening it lets you send them a request. */
export default async function FriendLink({ params }: PageProps<'/f/[handle]'>) {
  const { handle } = await params;
  return <FriendLinkPage handle={decodeURIComponent(handle).toLowerCase()} />;
}
