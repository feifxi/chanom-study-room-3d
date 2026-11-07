import { HomeSidebar } from '@/components/app/HomeSidebar';

export default function HomeLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <HomeSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto rounded-3xl border bg-card shadow-soft">{children}</main>
    </>
  );
}
