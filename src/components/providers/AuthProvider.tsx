'use client';

import { ClerkProvider } from '@clerk/nextjs';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'var(--accent)',
          colorBackground: 'var(--bg-elevated)',
          colorInputBackground: 'var(--bg-elevated)',
          colorInputText: 'var(--text-primary)',
          colorText: 'var(--text-primary)',
          colorTextSecondary: 'var(--text-secondary)',
          colorTextOnPrimaryBackground: 'white',
          colorDanger: 'var(--error)',
          colorSuccess: 'var(--success)',
          colorWarning: 'var(--warning)',
          colorNeutral: 'var(--text-tertiary)',
          borderRadius: '14px',
          fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
          fontSize: '1.09rem',
          fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
          },
          spacingUnit: '0.25rem',
        },
        elements: {
          // Sign-in modal root
          signIn: {
            borderRadius: '28px',
            boxShadow: '0 8px 40px 0 rgba(0,0,0,0.22)',
            background: 'var(--bg-elevated)',
            padding: '0',
            maxWidth: '410px',
            minWidth: '370px',
            position: 'relative',
            overflow: 'visible',
          },
          // Modal header
          headerTitle: {
            fontFamily: 'var(--font-sans)',
            fontSize: '2.1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '1.2rem',
            textAlign: 'center',
            letterSpacing: '-0.01em',
            zIndex: 1,
          },
          // Google/social button
          socialButtonsBlockButton: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.7rem',
            background: 'linear-gradient(90deg, #ff9100 0%, #ff6d00 100%)',
            color: '#fff',
            borderRadius: '14px',
            fontWeight: 600,
            fontSize: '1.09rem',
            padding: '1.05rem 0',
            marginBottom: '0.7rem',
            boxShadow: '0 2px 12px 0 rgba(255, 140, 0, 0.13)',
            border: 'none',
            transition: 'box-shadow 0.18s, background 0.18s',
            position: 'relative',
            zIndex: 1,
          },
          socialButtonsBlockButton__google: {
            background: 'linear-gradient(90deg, #fff 0%, #fff 100%)',
            color: '#222',
            border: '1.5px solid #e0e0e0',
            boxShadow: '0 2px 10px 0 rgba(255, 140, 0, 0.08)',
            position: 'relative',
          },
          socialButtonsBlockButton__google__icon: {
            width: '2.1rem',
            height: '2.1rem',
            marginRight: '0.7rem',
          },
          socialButtonsBlockButton__icon: {
            width: '2.1rem',
            height: '2.1rem',
            marginRight: '0.7rem',
          },
          socialButtonsBlockButton__lastUsed: {
            fontSize: '0.97rem',
            color: '#ff9100',
            fontWeight: 500,
            marginLeft: '0.6rem',
            marginTop: '0.1rem',
            background: 'none',
            padding: 0,
            position: 'absolute',
            right: '1.2rem',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
          },
          // Input fields
          formFieldInput: {
            borderRadius: '12px',
            border: '1.5px solid var(--border-default)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '1.09rem',
            padding: '1.05rem 1.2rem',
            marginBottom: '1.1rem',
            boxShadow: '0 1px 6px 0 rgba(255, 140, 0, 0.05)',
            transition: 'border 0.18s, box-shadow 0.18s',
          },
          // Continue button
          formButtonPrimary: {
            background: 'linear-gradient(90deg, #ff9100 0%, #ff6d00 100%)',
            color: '#fff',
            borderRadius: '14px',
            fontWeight: 700,
            fontSize: '1.11rem',
            padding: '1.05rem 0',
            marginTop: '0.7rem',
            boxShadow: '0 2px 12px 0 rgba(255, 140, 0, 0.13)',
            border: 'none',
            transition: 'box-shadow 0.18s, background 0.18s',
            position: 'relative',
            zIndex: 1,
          },
          dividerText: {
            color: 'var(--text-tertiary)',
            fontSize: '1.01rem',
            fontWeight: 500,
            margin: '1.2rem 0 1.2rem 0',
            zIndex: 1,
          },
          // ...existing code...
          // Root containers
          rootBox: {
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
          },
          
          // Cards and main containers - match FlowVault card styling
          card: {
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'none',
            color: 'var(--text-primary)',
          },
          
          cardBox: {
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
          },
          
          // Headers - match FlowVault typography
          headerTitle: {
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '24px',
            lineHeight: '1.25',
          },
          
          headerSubtitle: {
            color: 'var(--text-secondary)',
            fontWeight: 400,
            fontSize: '14px',
          },
          
          // Form elements - match input styling exactly
          formFieldLabel: {
            color: 'var(--text-primary)',
            fontWeight: 500,
            fontSize: '14px',
            marginBottom: '6px',
          },
          
          formFieldInput: {
            backgroundColor: 'transparent',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            height: '40px',
            padding: '0 12px',
            transition: 'all var(--transition-fast)',
            '&:hover:not(:focus)': {
              borderColor: 'var(--border-hover)',
            },
            '&:focus': {
              borderColor: 'var(--accent)',
              boxShadow: '0 0 0 3px var(--accent-muted)',
              outline: 'none',
            },
            '&::placeholder': {
              color: 'var(--text-tertiary)',
            },
          },
          
          // Primary buttons - orange by default with subtle hover effect
          formButtonPrimary: {
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: '14px',
            height: '40px',
            padding: '0 16px',
            transition: 'all var(--transition-fast)',
            '&:hover': {
              backgroundColor: 'var(--accent-hover)',
              borderColor: 'var(--accent-hover)',
              boxShadow: '0 0 0 4px var(--accent-muted)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
          },
          
          // Secondary buttons - match btn-secondary exactly
          formButtonSecondary: {
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: '14px',
            height: '40px',
            padding: '0 16px',
            transition: 'all var(--transition-fast)',
            '&:hover': {
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
            },
          },
          
          // Social buttons - match btn-secondary pattern with nav-item hover effect
          socialButtonsBlockButton: {
            backgroundColor: 'transparent',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            fontWeight: 500,
            height: '40px',
            padding: '0 16px',
            transition: 'all var(--transition-fast)',
            '&:hover': {
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-hover)',
            },
          },
          
          socialButtonsBlockButtonText: {
            color: 'inherit',
            fontWeight: 500,
          },
          
          // Social button icons - restore original size
          socialButtonsBlockButtonArrowIcon: {
            width: '16px',
            height: '16px',
          },
          
          // Dividers
          dividerLine: {
            backgroundColor: 'var(--border-default)',
          },
          
          dividerText: {
            color: 'var(--text-tertiary)',
            fontSize: '12px',
            fontWeight: 500,
          },
          
          // Links - subtle accent color
          footerActionLink: {
            color: 'var(--accent)',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '14px',
            '&:hover': {
              color: 'var(--accent-hover)',
            },
          },
          
          // UserButton - match nav-item hover pattern
          userButtonTrigger: {
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            padding: '0',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
            outline: 'none',
            '&:hover': {
              backgroundColor: 'var(--bg-subtle)',
            },
            '&:focus-visible': {
              outline: '2px solid var(--accent)',
              outlineOffset: '2px',
            },
          },
          
          userButtonAvatarBox: {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'transparent',
            border: 'none',
          },
          
          // UserButton popover - match sidebar patterns
          userButtonPopoverCard: {
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            color: 'var(--text-primary)',
            minWidth: '200px',
            maxWidth: '200px',
            padding: '6px',
          },
          
          userButtonPopoverMain: {
            backgroundColor: 'var(--bg-elevated)',
            padding: '0',
          },
          
          // Match nav-item styling exactly
          userButtonPopoverActionButton: {
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            transition: 'all var(--transition-fast)',
            '&:hover': {
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
            },
          },
          
          userButtonPopoverActionButtonText: {
            color: 'inherit',
            fontSize: '14px',
            fontWeight: 500,
          },
          
          userButtonPopoverActionButtonIcon: {
            color: 'inherit',
            width: '18px',
            height: '18px',
            transition: 'color var(--transition-fast)',
          },
          
          // Hide branding footer
          userButtonPopoverFooter: {
            display: 'none',
          },
          
          // Modal styling - subtle backdrop
          modalBackdrop: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
          },
          
          modal: {
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)',
          },
          
          // Profile modals - match nav styling
          navbar: {
            backgroundColor: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-default)',
          },
          
          navbarButton: {
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            transition: 'all var(--transition-fast)',
            '&:hover': {
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
            },
            '&[data-active="true"]': {
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              borderBottom: '3px solid var(--accent)',
            },
          },
          
          // Profile sections
          profileSection: {
            backgroundColor: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-default)',
            padding: '16px',
          },
          
          profileSectionContent: {
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            padding: '0',
          },
          
          // Profile buttons - match secondary button pattern
          profileSectionPrimaryButton: {
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: '14px',
            height: '36px',
            padding: '0 12px',
            transition: 'all var(--transition-fast)',
            '&:hover': {
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
            },
          },
          
          // Profile form elements
          profileSectionItem: {
            backgroundColor: 'var(--bg-elevated)',
            border: 'none',
            borderRadius: '0',
            padding: '12px 0',
            borderBottom: '1px solid var(--border-default)',
          },
          
          profileSectionItemButton: {
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: '14px',
            height: '36px',
            padding: '0 12px',
            transition: 'all var(--transition-fast)',
            '&:hover': {
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
            },
          },
          
          // Identity preview (profile info display)
          identityPreview: {
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            marginBottom: '16px',
          },
          
          identityPreviewText: {
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 500,
          },
          
          identityPreviewEditButton: {
            color: 'var(--accent)',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: 'transparent',
            border: 'none',
            padding: '0',
            '&:hover': {
              color: 'var(--accent-hover)',
            },
          },
          
          // Form field rows
          formFieldRow: {
            marginBottom: '16px',
          },
          
          // Form field labels
          formFieldLabelRow: {
            marginBottom: '6px',
          },
          
          // Form field inputs in profile
          formFieldInputGroup: {
            position: 'relative',
          },
          
          // Form buttons in profile context
          formButtonRow: {
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            justifyContent: 'flex-end',
          },
          
          // Page layout
          page: {
            backgroundColor: 'var(--bg-elevated)',
            padding: '0',
          },
          
          // Main container
          main: {
            backgroundColor: 'var(--bg-elevated)',
            padding: '24px',
            maxWidth: '600px',
            margin: '0 auto',
          },
          
          // Scrollable content
          scrollBox: {
            backgroundColor: 'var(--bg-elevated)',
            padding: '0',
          },
          
          // Modal close button
          modalCloseButton: {
            color: 'var(--text-tertiary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
            '&:hover': {
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-hover)',
            },
          },
          
          // Alert/success messages
          alert: {
            backgroundColor: 'var(--success-muted)',
            color: 'var(--success)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            fontSize: '14px',
            marginBottom: '16px',
          },
          
          // Error messages
          formFieldErrorText: {
            color: 'var(--error)',
            fontSize: '12px',
            marginTop: '4px',
          },
          
          // Tab content
          tabPanel: {
            padding: '0',
          },
          
          // Tab list
          tabList: {
            borderBottom: '1px solid var(--border-default)',
            marginBottom: '24px',
          },
          
          // Tab buttons
          tab: {
            color: 'var(--text-secondary)',
            borderBottom: '2px solid transparent',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '0',
            transition: 'all var(--transition-fast)',
            '&:hover': {
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-subtle)',
            },
            '&[data-state="active"]': {
              color: 'var(--accent)',
              borderBottomColor: 'var(--accent)',
            },
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
