import { useState, useEffect } from 'react';

// `storageKey` scopes the preference to a specific panel (e.g. 'theme' for the
// user dashboard, 'adminTheme' for the admin panel) so toggling dark mode in
// one panel doesn't affect the other. App.jsx applies the right key's value
// to <html> whenever the active panel changes.
export function useDarkMode(storageKey = 'theme') {
  const [isDark, setIsDark] = useState(() => localStorage.getItem(storageKey) === 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem(storageKey, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(storageKey, 'light');
    }
  }, [isDark, storageKey]);

  return [isDark, setIsDark];
}
