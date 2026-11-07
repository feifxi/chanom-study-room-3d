'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export const PALETTES = [
  { id: 'strawberry', label: 'Strawberry milk', swatch: '#df6392' },
  { id: 'thaitea', label: 'Thai tea', swatch: '#e8772e' },
  { id: 'matcha', label: 'Matcha latte', swatch: '#4f9e6c' },
  { id: 'blueberry', label: 'Blueberry soda', swatch: '#4a7fd6' },
  { id: 'taro', label: 'Taro bubble tea', swatch: '#8a6ad8' },
  { id: 'cocoa', label: 'Cocoa', swatch: '#a0674b' },
] as const;
export type Palette = (typeof PALETTES)[number]['id'];

const KEY = 'connecta-demo:palette';
const PaletteContext = createContext<{ palette: Palette; setPalette: (p: Palette) => void }>({
  palette: 'strawberry',
  setPalette: () => {},
});

export const usePalette = () => useContext(PaletteContext);

function loadPalette(): Palette {
  if (typeof window === 'undefined') return 'strawberry';
  try {
    const saved = localStorage.getItem(KEY) as Palette | null;
    return saved && PALETTES.some((p) => p.id === saved) ? saved : 'strawberry';
  } catch {
    return 'strawberry';
  }
}

/** Theme (light/dark via next-themes) and brand palette (data-palette on <html>). */
export function Providers({ children }: { children: ReactNode }) {
  // The palette only shows in popovers and settings (closed on first paint), so reading storage up front can't cause a visible hydration mismatch
  const [palette, setPaletteState] = useState<Palette>(loadPalette);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      // Not remembered, still applied
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <PaletteContext.Provider value={{ palette, setPalette }}>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="top-center" />
        </TooltipProvider>
      </PaletteContext.Provider>
    </ThemeProvider>
  );
}
