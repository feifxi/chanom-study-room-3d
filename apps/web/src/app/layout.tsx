import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai, JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });
const thai = IBM_Plex_Sans_Thai({ variable: '--font-thai', subsets: ['thai'], weight: ['400', '500', '600', '700'] });
const mono = JetBrains_Mono({ variable: '--font-mono-face', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Demo Chanom Study Room',
  description: 'A cosy 3D online study room. Study together with friends.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${manrope.variable} ${thai.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
