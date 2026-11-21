'use client';

import { useParams } from 'next/navigation';
import { MessagesSidebar } from '@/features/messages/MessagesSidebar';
import { cn } from '@/lib/utils';

/** Messages: conversations on the left, the open one on the right. Phones show one at a time. */
export default function MessagesLayout({ children }: LayoutProps<'/home/messages'>) {
  const { id } = useParams<{ id?: string }>();
  return (
    <div className="flex h-full">
      <MessagesSidebar className={cn('w-full flex-none md:flex md:w-80', id && 'hidden')} />
      <div className={cn('min-w-0 flex-1', !id && 'hidden md:block')}>{children}</div>
    </div>
  );
}
