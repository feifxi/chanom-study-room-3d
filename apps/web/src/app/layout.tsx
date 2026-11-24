import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai, JetBrains_Mono, Nunito } from 'next/font/google';
import { TestTools } from '@/components/TestTools';
import { Providers } from '@/components/Providers';
import './globals.css';

const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'] });
const thai = IBM_Plex_Sans_Thai({ variable: '--font-thai', subsets: ['thai'], weight: ['400', '500', '600', '700'] });
const mono = JetBrains_Mono({ variable: '--font-mono-face', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Connecta',
  description: 'Cosy 3D rooms where your friends hang out, study and play together.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${nunito.variable} ${thai.variable} ${mono.variable} h-full`}>
      <body className="app-bg min-h-full">
        <Providers>
          {children}
          {/* Shortcuts for testing by hand; never in production */}
          {process.env.NODE_ENV !== 'production' && <TestTools />}
        </Providers>
      </body>
    </html>
  );
}
