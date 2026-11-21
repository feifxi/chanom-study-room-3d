import { AdminFrame } from '@/features/admin/AdminFrame';

/** The Connecta team's admin site (feature 14). In the real app it sits behind the team sign-in. */
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return <AdminFrame>{children}</AdminFrame>;
}
