'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#F97316',
          colorBackground: 'hsl(var(--background))',
          colorInputBackground: 'hsl(var(--background))',
          colorInputText: 'hsl(var(--foreground))',
          colorText: 'hsl(var(--foreground))',
          colorTextSecondary: 'hsl(var(--muted-foreground))',
          colorDanger: 'hsl(var(--destructive))',
          fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          fontSize: '0.875rem',
          borderRadius: '0.5rem',
        },
        elements: {
          // Card
          card: 'bg-card/50 backdrop-blur-sm text-card-foreground shadow-2xl border border-border/50',
          rootBox: 'w-full',
          
          // Header
          headerTitle: 'text-foreground font-bold text-xl',
          headerSubtitle: 'text-muted-foreground text-sm',
          
          // Social buttons
          socialButtonsBlockButton: 'bg-secondary/50 hover:bg-secondary/70 text-foreground border border-border/50 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-[#F97316]/50 font-medium',
          socialButtonsBlockButtonText: 'text-foreground font-medium',
          
          // Form elements
          formFieldLabel: 'text-foreground font-medium text-sm',
          formFieldInput: 'bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-all duration-200',
          formButtonPrimary: 'bg-[#F97316] hover:bg-[#FB923C] text-white font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] hover:shadow-[#F97316]/30',
          formButtonReset: 'text-muted-foreground hover:text-foreground transition-colors duration-200',
          
          // Links
          footerActionLink: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200 font-medium hover:underline underline-offset-2',
          formFieldAction: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200 hover:underline underline-offset-2',
          
          // Divider
          dividerLine: 'bg-border',
          dividerText: 'text-muted-foreground text-xs',
          
          // User button (configured in UserProfile component for better control)
          userButtonBox: 'rounded-full',
          userButtonTrigger: 'rounded-full focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] transition-all duration-200 hover:scale-105',
          userButtonAvatarBox: 'rounded-full w-8 h-8',
          
          // Modal backdrop - theme-aware
          modalBackdrop: 'bg-[var(--bg-base)]/80 backdrop-blur-sm',

          // Popover - theme-aware styling (do not hide the popover footer)
          userButtonPopoverCard: 'bg-[var(--bg-elevated)] !bg-opacity-100 !opacity-100 border border-[var(--border-default)] shadow-2xl',
          userButtonPopoverMain: 'bg-[var(--bg-elevated)] !bg-opacity-100',
          userButtonPopoverFooter: 'block',
          userButtonPopoverActionButton: 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors duration-200',
          userButtonPopoverActionButtonText: 'text-[var(--text-primary)] font-medium',
          userButtonPopoverActionButtonIcon: 'text-[var(--text-tertiary)]',
          
          // Profile
          profileSectionPrimaryButton: 'bg-[#F97316] hover:bg-[#FB923C] text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-[#F97316]/30',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}