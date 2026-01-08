"use client";

import React from 'react';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
    >
        <FirebaseClientProvider>
            {children}
        </FirebaseClientProvider>
    </ThemeProvider>
  );
}
