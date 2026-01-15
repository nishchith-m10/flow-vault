'use client';

import { UserButton, useUser } from '@clerk/nextjs';

export function UserProfile() {
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-24 bg-[var(--bg-subtle)] rounded animate-pulse" />
          <div className="h-3 w-32 bg-[var(--bg-subtle)] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-[var(--radius-sm)] transition-all hover:bg-[var(--bg-subtle)] w-full">
      {/* User Avatar */}
      <UserButton 
        afterSignOutUrl="/sign-in"
        signInUrl="/sign-in"
        appearance={{
          variables: {
            colorPrimary: 'var(--accent)',
            colorBackground: 'var(--bg-elevated)',
            colorText: 'var(--text-primary)',
            colorTextSecondary: 'var(--text-secondary)',
            colorTextOnPrimaryBackground: 'white',
            borderRadius: '8px',
            spacingUnit: '0.5rem',
            fontSize: '14px'
          },
          elements: {
            // Avatar styling
            userButtonBox: 'flex items-center',
            userButtonTrigger: {
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              padding: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 0 0 3px var(--accent-muted)'
              },
              '&:focus-visible': {
                boxShadow: '0 0 0 3px var(--accent-muted)',
                outline: 'none'
              }
            },
            userButtonAvatarBox: {
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden'
            },
            
            // Popover container
            userButtonPopoverCard: {
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: '200px',
              maxWidth: '200px',
              padding: '6px'
            },
            userButtonPopoverMain: {
              backgroundColor: 'var(--bg-elevated)',
              padding: '0'
            },

            // Action buttons
            userButtonPopoverActionButton: {
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'var(--bg-subtle)'
              }
            },
            userButtonPopoverActionButtonText: {
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '500'
            },
            userButtonPopoverActionButtonIcon: {
              color: 'var(--text-tertiary)',
              width: '16px',
              height: '16px'
            },
            
            // Hide user preview but keep footer/actions visible
            userPreview: {
              display: 'none'
            },
            userPreviewMainIdentifier: {
              display: 'none'
            },
            userPreviewSecondaryIdentifier: {
              display: 'none'
            },
            userPreviewAvatarContainer: {
              display: 'none'
            },

            // Leave modal backdrop handling to global CSS (theme-aware)

            card: {
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
            },
            rootBox: {
              backgroundColor: 'var(--bg-elevated)'
            },
            cardBox: {
              backgroundColor: 'var(--bg-elevated)'
            },
            navbar: {
              backgroundColor: 'var(--bg-elevated)',
              borderBottom: '1px solid var(--border-default)'
            },
            navbarButton: {
              color: 'var(--text-secondary)',
              '&:hover': {
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-hover)'
              }
            },
            navbarButtonActive: {
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-hover)',
              borderBottom: '2px solid var(--accent)'
            },
            formFieldInput: {
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              '&::placeholder': {
                color: 'var(--text-tertiary)'
              }
            },
            formFieldLabel: {
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '500'
            },
            formButtonPrimary: {
              backgroundColor: 'var(--accent)',
              color: 'white',
              fontWeight: '500',
              '&:hover': {
                backgroundColor: 'var(--accent-hover)'
              }
            }
          }
        }}
      />

      {/* Name and Email - Always Visible */}
      <div className="flex-1 min-w-0 max-w-[140px]">
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
          {user.firstName || user.fullName || 'User'}
        </div>
        <div className="text-xs text-[var(--text-tertiary)] truncate">
          {user.primaryEmailAddress?.emailAddress}
        </div>
      </div>
    </div>
  );
}
