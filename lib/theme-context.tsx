'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('reflectiq_theme') as Theme | null;
        if (saved === 'light' || saved === 'dark') {
          return saved;
        }
      } catch {
        // ignore
      }
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    } catch {
      // safe fallback
    }
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem('reflectiq_theme', nextTheme);
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    } catch {
      // safe fallback
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
