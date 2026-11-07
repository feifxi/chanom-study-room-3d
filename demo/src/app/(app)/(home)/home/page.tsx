'use client';

import { HomeDashboard } from '@/features/home/HomeDashboard';
import { HomeFeed } from '@/features/home/HomeFeed';
import { HomeLive } from '@/features/home/HomeLive';
import { useVariant } from '@/lib/variants';

/** Home. The design is a demo variant (Demo tab → Home design) until one is picked. */
export default function HomePage() {
  const variant = useVariant('home');
  return variant === 'live' ? <HomeLive /> : variant === 'feed' ? <HomeFeed /> : <HomeDashboard />;
}
