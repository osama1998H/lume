import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  changeTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'lume-theme';

/**
 * Get the system's preferred color scheme
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Get the effective theme (resolving 'system' to actual theme)
 */
const getEffectiveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

/**
 * Apply theme to the document
 */
const applyTheme = (theme: 'light' | 'dark') => {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const allowedThemes: Theme[] = ['light', 'dark', 'system'];

  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize from localStorage or default to 'system'
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return allowedThemes.includes(stored as Theme) ? (stored as Theme) : 'system';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() =>
    getEffectiveTheme(theme)
  );

  useEffect(() => {
    // Apply the effective theme
    const effective = getEffectiveTheme(theme);
    setEffectiveTheme(effective);
    applyTheme(effective);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes when in 'system' mode
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newEffectiveTheme = e.matches ? 'dark' : 'light';
      setEffectiveTheme(newEffectiveTheme);
      applyTheme(newEffectiveTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    effectiveTheme,
    changeTheme,
    isDark: effectiveTheme === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
