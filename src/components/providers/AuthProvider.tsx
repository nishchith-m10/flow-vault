'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark, light } from '@clerk/themes';
import { useEffect, useState } from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const htmlElement = document.documentElement;
    const initialTheme = htmlElement.getAttribute('data-theme');
    setTheme(initialTheme === 'light' ? 'light' : 'dark');
    setMounted(true);

    const observer = new MutationObserver(() => {
      const currentTheme = htmlElement.getAttribute('data-theme');
      setTheme(currentTheme === 'light' ? 'light' : 'dark');
    });

    observer.observe(htmlElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return (
      <ClerkProvider
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#F97316',
            colorBackground: '#0A0A0B',
            colorInputBackground: '#141416',
            colorInputText: '#FAFAFA',
            colorText: '#FAFAFA',
            colorTextSecondary: '#A1A1A6',
            colorDanger: '#EF4444',
          },
        }}
      >
        {children}
      </ClerkProvider>
    );
  }

  const appearance = theme === 'dark' ? {
    baseTheme: dark,
    variables: {
      colorPrimary: '#F97316',
      colorBackground: '#0A0A0B',
      colorInputBackground: '#141416',
      colorInputText: '#FAFAFA',
      colorText: '#FAFAFA',
      colorTextSecondary: '#A1A1A6',
      colorDanger: '#EF4444',
    },
  } : {
    baseTheme: light,
    variables: {
      colorPrimary: '#F97316',
      colorBackground: '#FAFAFA',
      colorInputBackground: '#FFFFFF',
      colorInputText: '#18181B',
      colorText: '#18181B',
      colorTextSecondary: '#71717A',
      colorDanger: '#EF4444',
    },
  };

  return (
    <ClerkProvider appearance={appearance}>
      {children}
    </ClerkProvider>
  );
}