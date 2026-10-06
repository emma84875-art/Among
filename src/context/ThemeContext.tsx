import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppearanceMode } from '../types';

interface ThemeContextType {
  appearance: AppearanceMode;
  resolvedTheme: 'light' | 'dark';
  setAppearance: (mode: AppearanceMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'among_appearance';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<AppearanceMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved as AppearanceMode;
    }
    return 'dark';
  });

  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (appearance === 'system') {
      return getSystemTheme();
    }
    return appearance;
  });

  const applyThemeToDOM = useCallback((theme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Synchronize meta theme-color tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#09090b' : '#ffffff');
    }
  }, []);

  const updateResolvedTheme = useCallback(() => {
    let resolved: 'light' | 'dark';
    if (appearance === 'system') {
      resolved = getSystemTheme();
    } else {
      resolved = appearance;
    }
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
  }, [appearance, applyThemeToDOM]);

  useEffect(() => {
    updateResolvedTheme();

    if (appearance === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        updateResolvedTheme();
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appearance, updateResolvedTheme]);

  const setAppearance = useCallback((mode: AppearanceMode) => {
    setAppearanceState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Unable to persist appearance preference to localStorage', e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setAppearance(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setAppearance]);

  return (
    <ThemeContext.Provider
      value={{
        appearance,
        resolvedTheme,
        setAppearance,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
