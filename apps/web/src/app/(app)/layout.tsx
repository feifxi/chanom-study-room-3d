/** The signed-in app. Home's pages get the header (see HomeFrame); a room's page is its chat. */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return children;
}
