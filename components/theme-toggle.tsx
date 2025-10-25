'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './theme-provider';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background border border-input bg-background h-10 w-10" />
    );
  }

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getNextTheme = () => {
    if (theme === 'light') return 'dark';
    if (theme === 'dark') return 'system';
    return 'light';
  };

  const getCurrentIcon = () => {
    if (theme === 'light') {
      return <Sun className="h-[1.2rem] w-[1.2rem] transition-all duration-300" />;
    }
    if (theme === 'dark') {
      return <Moon className="h-[1.2rem] w-[1.2rem] transition-all duration-300" />;
    }
    return <Monitor className="h-[1.2rem] w-[1.2rem] transition-all duration-300" />;
  };

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 h-10 w-10"
      aria-label={`Current theme: ${theme}. Click to switch to ${getNextTheme()} theme`}
      title={`Switch to ${getNextTheme()} theme`}
    >
      {getCurrentIcon()}
      <span className="sr-only">
        Current theme: {theme}. Click to switch to {getNextTheme()} theme
      </span>
    </button>
  );
}