'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InboxListener } from '@/features/inbox/useInbox';
import { AccountListener } from '@/features/account/AccountListener';
import { PlusListener } from '@/features/plus/PlusListener';
import { QuestsListener } from '@/features/quests/useQuests';
import { PresenceReporter } from '@/features/presence/usePresence';

/** Server data (TanStack Query) and theme (light/dark via next-themes). One brand colour, Thai tea, set in globals.css. */
export function Providers({ children }: { children: ReactNode }) {
  // One cache per browser tab (made in state so it survives re-renders)
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <TooltipProvider delayDuration={200}>
          {children}
          <PresenceReporter />
          <InboxListener />
          <QuestsListener />
          <PlusListener />
          <AccountListener />
          <Toaster position="top-center" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
