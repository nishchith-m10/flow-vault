'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useEffect, useState } from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check initial theme
    const htmlElement = document.documentElement;
    const initialTheme = htmlElement.getAttribute('data-theme');
    setIsDarkMode(initialTheme !== 'light');
    setMounted(true);

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const theme = htmlElement.getAttribute('data-theme');
      setIsDarkMode(theme !== 'light');
    });

    observer.observe(htmlElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  // Prevent hydration mismatch - wait for mounting
  if (!mounted) {
    return (
      <ClerkProvider
        appearance={{
          baseTheme: dark,
          variables: getDarkVariables(),
          elements: getClerkElements(true),
        }}
      >
        {children}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: isDarkMode ? getDarkVariables() : getLightVariables(),
        elements: getClerkElements(isDarkMode),
      }}
    >
      {children}
    </ClerkProvider>
  );
}

function getDarkVariables() {
  return {
    colorPrimary: '#F97316',
    colorBackground: '#0A0A0B',
    colorInputBackground: '#141416',
    colorInputText: '#FAFAFA',
    colorText: '#FAFAFA',
    colorTextSecondary: '#A1A1A6',
    colorDanger: '#EF4444',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    fontSize: '0.875rem',
    borderRadius: '0.5rem',
  };
}

function getLightVariables() {
  return {
    colorPrimary: '#F97316',
    colorBackground: '#FAFAFA',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#18181B',
    colorText: '#18181B',
    colorTextSecondary: '#71717A',
    colorDanger: '#EF4444',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    fontSize: '0.875rem',
    borderRadius: '0.5rem',
  };
}

function getClerkElements(isDarkMode: boolean) {
  return {
    rootBox: 'w-full',
    card: isDarkMode
      ? 'bg-[#141416] border border-[#3F3F46] rounded-lg shadow-lg'
      : 'bg-[#FFFFFF] border border-[#D4D4D8] rounded-lg shadow-lg',
    headerTitle: isDarkMode ? 'text-[#FAFAFA]' : 'text-[#18181B]',
    headerSubtitle: isDarkMode ? 'text-[#A1A1A6]' : 'text-[#71717A]',
    socialButtonsBlockButton: isDarkMode
      ? 'bg-[#232326] border border-[#3F3F46] text-[#FAFAFA] rounded-md hover:bg-[#2F2F33]'
      : 'bg-[#F4F4F5] border border-[#D4D4D8] text-[#18181B] rounded-md hover:bg-[#E4E4E7]',
    socialButtonsBlockButtonText: isDarkMode ? 'text-[#FAFAFA]' : 'text-[#18181B]',
    formFieldLabel: isDarkMode ? 'text-[#FAFAFA]' : 'text-[#18181B]',
    formFieldInput: isDarkMode
      ? 'bg-[#0A0A0B] border border-[#3F3F46] text-[#FAFAFA] rounded-md'
      : 'bg-[#FAFAFA] border border-[#D4D4D8] text-[#18181B] rounded-md',
    formButtonPrimary: 'bg-[#F97316] hover:bg-[#FB923C] text-white rounded-md font-medium',
    footerActionLink: 'text-[#F97316] hover:text-[#FB923C]',
    formFieldAction: 'text-[#F97316] hover:text-[#FB923C]',
    dividerLine: isDarkMode ? 'bg-[#3F3F46]' : 'bg-[#D4D4D8]',
    dividerText: isDarkMode ? 'text-[#A1A1A6]' : 'text-[#71717A]',
    userButtonBox: 'rounded-full',
    userButtonTrigger: 'rounded-full',
    userButtonAvatarBox: 'rounded-full',
    userButtonPopoverCard: isDarkMode
      ? 'bg-[#141416] border border-[#3F3F46] rounded-lg'
      : 'bg-[#FFFFFF] border border-[#D4D4D8] rounded-lg',
    userButtonPopoverMain: isDarkMode ? 'bg-[#141416]' : 'bg-[#FFFFFF]',
    userButtonPopoverActionButton: isDarkMode
      ? 'text-[#FAFAFA] hover:bg-[#232326]'
      : 'text-[#18181B] hover:bg-[#F4F4F5]',
    userButtonPopoverActionButtonText: isDarkMode ? 'text-[#FAFAFA]' : 'text-[#18181B]',
  };
}