import { HomeFrame } from '@/components/app/AppFrame';

export default function HomeLayout({ children }: LayoutProps<'/'>) {
  return <HomeFrame>{children}</HomeFrame>;
}
