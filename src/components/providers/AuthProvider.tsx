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
          variables: {
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
          },
          elements: getClerkElements(true),
        }}
      >
        {children}
      </ClerkProvider>
    );
  }

  const baseTheme = isDarkMode ? dark : undefined;

  return (
    <ClerkProvider
      appearance={{
        baseTheme,
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
    colorPrimary: '#EA580C',
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
  const bgBase = isDarkMode ? '#0A0A0B' : '#FAFAFA';
  const bgElevated = isDarkMode ? '#141416' : '#FFFFFF';
  const bgHover = isDarkMode ? '#27272A' : '#F4F4F5';
  const textPrimary = isDarkMode ? '#FAFAFA' : '#18181B';
  const textSecondary = isDarkMode ? '#D4D4D8' : '#52525B';
  const textTertiary = isDarkMode ? '#A1A1A6' : '#71717A';
  const borderDefault = isDarkMode ? '#27272A' : '#E4E4E7';

  return {
    // Card
    card: `bg-[${bgElevated}] backdrop-blur-sm text-[${textPrimary}] shadow-2xl border border-[${borderDefault}]/50`,
    rootBox: 'w-full',

    // Header
    headerTitle: `text-[${textPrimary}] font-bold text-xl`,
    headerSubtitle: `text-[${textTertiary}] text-sm`,

    // Social buttons
    socialButtonsBlockButton: `bg-[${bgHover}] hover:bg-[${bgHover}]/80 text-[${textPrimary}] border border-[${borderDefault}] transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-[#F97316]/50 font-medium`,
    socialButtonsBlockButtonText: `text-[${textPrimary}] font-medium`,

    // Form elements
    formFieldLabel: `text-[${textPrimary}] font-medium text-sm`,
    formFieldInput: `bg-[${bgElevated}] border-[${borderDefault}] text-[${textPrimary}] placeholder:text-[${textSecondary}] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-all duration-200`,
    formButtonPrimary: 'bg-[#F97316] hover:bg-[#FB923C] text-white font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] hover:shadow-[#F97316]/30',
    formButtonReset: `text-[${textSecondary}] hover:text-[${textPrimary}] transition-colors duration-200`,

    // Links
    footerActionLink: '#F97316 hover:text-[#FB923C] transition-colors duration-200 font-medium hover:underline underline-offset-2',
    formFieldAction: '#F97316 hover:text-[#FB923C] transition-colors duration-200 hover:underline underline-offset-2',

    // Divider
    dividerLine: `bg-[${borderDefault}]`,
    dividerText: `text-[${textTertiary}] text-xs`,

    // User button
    userButtonBox: 'rounded-full',
    userButtonTrigger: `rounded-full focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 focus:ring-offset-[${bgBase}] transition-all duration-200 hover:scale-105`,
    userButtonAvatarBox: 'rounded-full w-8 h-8',

    // Modal backdrop
    modalBackdrop: `bg-[${bgBase}]/80 backdrop-blur-sm`,

    // Popover
    userButtonPopoverCard: `bg-[${bgElevated}] !bg-opacity-100 !opacity-100 border border-[${borderDefault}] shadow-2xl`,
    userButtonPopoverMain: `bg-[${bgElevated}] !bg-opacity-100`,
    userButtonPopoverFooter: 'block',
    userButtonPopoverActionButton: `hover:bg-[${bgHover}] text-[${textPrimary}] transition-colors duration-200`,
    userButtonPopoverActionButtonText: `text-[${textPrimary}] font-medium`,
    userButtonPopoverActionButtonIcon: `text-[${textTertiary}]`,

    // Profile
    profileSectionPrimaryButton: 'bg-[#F97316] hover:bg-[#FB923C] text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-[#F97316]/30',
  };
}