'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeSnapshot = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
};

type ThemeContextValue = {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const storageKey = 'theme-preference';
const subscribers = new Set<() => void>();
let themeState: ThemeSnapshot = { theme: 'system', resolvedTheme: 'light' };

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') {
    return theme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function notifySubscribers() {
  for (const notify of subscribers) {
    notify();
  }
}

function applyTheme(theme: Theme) {
  const resolvedTheme = resolveTheme(theme);
  const root = document.documentElement;

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.style.colorScheme = resolvedTheme;

  themeState = { theme, resolvedTheme };
  notifySubscribers();
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

function getSnapshot() {
  return themeState;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const setTheme = useCallback((theme: Theme) => {
    if (theme === 'system') {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, theme);
    }

    applyTheme(theme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(themeState.resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const initial = stored === 'light' || stored === 'dark' ? stored : 'system';

    applyTheme(initial);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeState.theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const value = useMemo(
    () => ({
      setTheme,
      toggleTheme,
    }),
    [setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    theme: snapshot.theme,
    resolvedTheme: snapshot.resolvedTheme,
    setTheme: context.setTheme,
    toggleTheme: context.toggleTheme,
  };
}
