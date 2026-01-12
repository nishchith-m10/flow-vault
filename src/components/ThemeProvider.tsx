'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return a safe default during SSR/prerendering
    return {
      theme: 'dark' as Theme,
      setTheme: () => {},
    };
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('flowvault-theme') as Theme | null;
      if (stored && ['dark', 'light'].includes(stored)) {
        setTheme(stored);
      }
    }
    setMounted(true);
  }, []);

  // Set mounted flag on first render
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Save theme to localStorage when changed
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('flowvault-theme', theme);
    }
  }, [theme, mounted]);

  // Apply theme to document
  useEffect(() => {
    if (mounted) {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      root.style.colorScheme = theme;
    }
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-icon btn-sm"
      title={`Theme: ${theme}`}
      aria-label={`Current theme: ${theme}. Click to change.`}
    >
      {theme === 'dark' && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
      {theme === 'light' && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
