'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark
  const [mounted, setMounted] = useState(false);

  // Check for saved theme on mount or default to dark
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Set dark as default and save it
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
    }
    setMounted(true);
  }, []);

  // Update localStorage and document class when theme changes
  useEffect(() => {
    if (mounted) {
      console.log('Theme changed to:', theme);
      localStorage.setItem('theme', theme);
      
      // Update the document element class for Tailwind
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('Toggling theme from', theme, 'to', newTheme);
    setTheme(newTheme);
  };

  const contextValue: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  // Prevent hydration issues by not rendering until mounted
  if (!mounted) {
    return (
      <ThemeContext.Provider value={contextValue}>
        <div suppressHydrationWarning>
          {children}
        </div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // During hydration, provide a safe fallback instead of throwing
    if (typeof window === 'undefined') {
      return {
        theme: 'dark' as Theme,
        toggleTheme: () => {},
        setTheme: () => {},
      };
    }
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

