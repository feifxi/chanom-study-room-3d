'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InboxListener } from '@/features/inbox/useInbox';
import { PlusListener } from '@/features/plus/PlusListener';
import { QuestsListener } from '@/features/quests/useQuests';
import { PresenceReporter } from '@/features/presence/usePresence';
import { loadViewer, useViewer } from '@/lib/viewer';

/** Server data (TanStack Query) and theme (light/dark via next-themes). One brand colour, Thai tea, set in globals.css. */
export function Providers({ children }: { children: ReactNode }) {
  // One cache per browser tab (made in state so it survives re-renders)
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  // Demo "View as": switching who you are remounts the page, like signing in as someone else
  const viewer = useViewer();
  useEffect(loadViewer, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <TooltipProvider delayDuration={200}>
          <Fragment key={viewer}>{children}</Fragment>
          <PresenceReporter />
          <InboxListener />
          <QuestsListener />
          <PlusListener />
          <Toaster position="top-center" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
