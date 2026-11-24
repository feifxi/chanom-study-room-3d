'use client';

import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Me } from '@/lib/api/client';
import { initMyLook } from '@/lib/myLook';
import { ME_KEY } from './useMe';

/** Puts the account the server already loaded (or null, signed out) into the client's cache, so useMe() doesn't ask again. */
export function MeSeed({ me, children }: { me: Me | null; children: ReactNode }) {
  const client = useQueryClient();
  // Once, during the first render, before any child reads it
  useState(() => {
    client.setQueryData(ME_KEY, me);
    if (me?.look) initMyLook(me.look);
  });
  return children;
}
