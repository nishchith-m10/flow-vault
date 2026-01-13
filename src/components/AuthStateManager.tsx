'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';
import { SignInTransition, SignOutTransition } from './AuthTransitions';

export default function AuthStateManager() {
  const { isLoaded, userId } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Wait for Clerk to finish loading
    if (!isLoaded) return;

    const prevUserId = prevUserIdRef.current;

    // First load - no transition
    if (prevUserId === undefined) {
      prevUserIdRef.current = userId || null;
      return;
    }

    // User just signed in (null -> userId)
    if (!prevUserId && userId) {
      setShowSignIn(true);
    }

    // User just signed out (userId -> null)
    if (prevUserId && !userId) {
      setShowSignOut(true);
    }

    prevUserIdRef.current = userId || null;
  }, [isLoaded, userId]);

  return (
    <>
      <SignInTransition 
        show={showSignIn} 
        onComplete={() => setShowSignIn(false)} 
      />
      <SignOutTransition 
        show={showSignOut} 
        onComplete={() => setShowSignOut(false)} 
      />
    </>
  );
}
