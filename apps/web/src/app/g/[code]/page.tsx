import { InvitePage } from '@/features/rooms/InvitePage';

/** A guest pass: walk into the room for 24 hours, no account needed. */
export default async function GuestPassPage({ params }: PageProps<'/g/[code]'>) {
  const { code } = await params;
  return <InvitePage code={code} kind="guest" />;
}
