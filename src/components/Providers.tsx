'use client';

import * as React from 'react';
import { HeroUIProvider, ToastProvider } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <HeroUIProvider navigate={router.push}>
        {children}
        <ToastProvider />
      </HeroUIProvider>
    </ThemeProvider>
  );
}
