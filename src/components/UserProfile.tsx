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
      {/* User Avatar - ClerkProvider handles all appearance via AuthProvider */}
      <UserButton />

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
