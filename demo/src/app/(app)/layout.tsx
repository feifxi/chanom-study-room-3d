import { MobileNav } from '@/components/app/MobileNav';
import { ServerRail } from '@/components/app/ServerRail';

/**
 * The signed-in app: the server rail, then the section's own sidebar and content as floating cards
 * on the soft gradient (that gap between cards is most of what makes it feel cosy, not flat).
 * Phones get a bottom tab bar and a slide-in drawer instead of the rail and sidebar.
 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex h-dvh gap-2 p-2 pb-[76px] md:pb-2">
      <ServerRail />
      {children}
      <MobileNav />
    </div>
  );
}
