'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from './theme-provider';

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme as 'light' | 'dark'}
      position="top-right"
      richColors
      closeButton
      duration={4000}
    />
  );
}
