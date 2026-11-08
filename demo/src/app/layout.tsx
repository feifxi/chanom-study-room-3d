import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai, JetBrains_Mono, Nunito } from 'next/font/google';
import { DemoToolbar } from '@/components/DemoToolbar';
import { Providers } from '@/components/Providers';
import './globals.css';

const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'] });
const thai = IBM_Plex_Sans_Thai({ variable: '--font-thai', subsets: ['thai'], weight: ['400', '500', '600', '700'] });
const mono = JetBrains_Mono({ variable: '--font-mono-face', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Connecta (V2 demo)',
  description: 'Frontend-only demo of the V2 design: cosy 3D rooms with their own chat.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${nunito.variable} ${thai.variable} ${mono.variable} h-full`}>
      <body className="app-bg min-h-full">
        <Providers>
          {children}
          <DemoToolbar />
        </Providers>
      </body>
    </html>
  );
}
