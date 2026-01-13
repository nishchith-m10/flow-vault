import type { Metadata } from "next";
import "./globals.css";

// Import fonts
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";

import DashboardLayout from "@/components/DashboardLayout";
import { ModalProvider } from "@/components/Modal";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import AuthPages from "@/components/AuthPages";
import AuthStateManager from "@/components/AuthStateManager";

export const metadata: Metadata = {
  title: "FlowVault - n8n Workflow Manager",
  description:
    "Advanced workflow lifecycle management for n8n - archive, restore, and organize workflows at scale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('flowvault-theme');
                  if (theme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>
          <GlobalErrorBoundary>
            <ThemeProvider>
              <ToastProvider>
                <ModalProvider>
                  <CommandPaletteProvider>
                    <AuthStateManager />
                    <SignedIn>
                      <DashboardLayout>{children}</DashboardLayout>
                    </SignedIn>
                    <SignedOut>
                      <AuthPages />
                    </SignedOut>
                  </CommandPaletteProvider>
                </ModalProvider>
              </ToastProvider>
            </ThemeProvider>
          </GlobalErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
