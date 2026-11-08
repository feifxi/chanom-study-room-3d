import { MessageCircle } from 'lucide-react';

/** Messages with no conversation picked yet (wide screens; phones show the list instead). */
export default function MessagesIndex() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <MessageCircle className="mx-auto size-10 text-primary" />
        <p className="mt-3 text-lg font-black">Pick a friend to message</p>
        <p className="text-sm text-muted-foreground">Messages are 1-to-1. To talk with a group, make a room.</p>
      </div>
    </div>
  );
}
