import { InvitePage } from '@/features/rooms/InvitePage';

/** A member invite: whoever opens it can join the room. */
export default async function MemberInvitePage({ params }: PageProps<'/i/[code]'>) {
  const { code } = await params;
  return <InvitePage code={code} kind="member" />;
}
