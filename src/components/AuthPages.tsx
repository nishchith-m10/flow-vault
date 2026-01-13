'use client';

import { useState } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';

export default function AuthPages() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Welcome to FlowVault
          </h1>
          <p className="text-muted-foreground text-sm">
            Advanced workflow lifecycle management for n8n
          </p>
        </div>

        {/* Auth Container */}
        <div className="relative">
          {isSignUp ? (
            <SignUp 
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-card/50 backdrop-blur-sm shadow-2xl border border-border/50',
                  headerTitle: 'text-foreground',
                  headerSubtitle: 'text-muted-foreground',
                  
                  // Hide Clerk branding
                  footer: 'hidden',
                  footerPages: 'hidden',
                  
                  socialButtonsBlockButton: 'bg-secondary/50 hover:bg-secondary/70 text-foreground border border-border/50 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-[#F97316]/50',
                  socialButtonsBlockButtonText: 'text-foreground font-medium',
                  dividerLine: 'bg-border',
                  dividerText: 'text-muted-foreground',
                  formFieldLabel: 'text-foreground font-medium',
                  formFieldInput: 'bg-background/50 border-border/50 text-foreground focus:border-[#F97316] focus:ring-[#F97316]/20 transition-all duration-200',
                  formButtonPrimary: 'bg-[#F97316] hover:bg-[#FB923C] text-white font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#F97316]/30',
                  footerActionLink: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200 font-medium',
                  identityPreviewText: 'text-foreground',
                  identityPreviewEditButton: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200',
                  formFieldAction: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200',
                  formResendCodeLink: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200',
                  otpCodeFieldInput: 'bg-background/50 border-border/50 text-foreground focus:border-[#F97316]',
                }
              }}
            />
          ) : (
            <SignIn 
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-card/50 backdrop-blur-sm shadow-2xl border border-border/50',
                  headerTitle: 'text-foreground',
                  headerSubtitle: 'text-muted-foreground',
                  
                  // Hide Clerk branding
                  footer: 'hidden',
                  footerPages: 'hidden',
                  
                  socialButtonsBlockButton: 'bg-secondary/50 hover:bg-secondary/70 text-foreground border border-border/50 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-[#F97316]/50',
                  socialButtonsBlockButtonText: 'text-foreground font-medium',
                  dividerLine: 'bg-border',
                  dividerText: 'text-muted-foreground',
                  formFieldLabel: 'text-foreground font-medium',
                  formFieldInput: 'bg-background/50 border-border/50 text-foreground focus:border-[#F97316] focus:ring-[#F97316]/20 transition-all duration-200',
                  formButtonPrimary: 'bg-[#F97316] hover:bg-[#FB923C] text-white font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#F97316]/30',
                  footerActionLink: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200 font-medium',
                  identityPreviewText: 'text-foreground',
                  identityPreviewEditButton: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200',
                  formFieldAction: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200',
                  formResendCodeLink: 'text-[#F97316] hover:text-[#FB923C] transition-colors duration-200',
                  otpCodeFieldInput: 'bg-background/50 border-border/50 text-foreground focus:border-[#F97316]',
                }
              }}
            />
          )}
        </div>

        {/* Toggle Link */}
        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200 font-medium hover:underline underline-offset-4"
          >
            {isSignUp 
              ? "Already have an account? Sign in" 
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}