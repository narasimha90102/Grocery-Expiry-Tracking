'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useI18nStore } from '../store/i18nStore';

export default function ClientInitializer() {
  const initAuth = useAuthStore((state) => state.initAuth);
  const initTheme = useThemeStore((state) => state.initTheme);
  const setLanguage = useI18nStore((state) => state.setLanguage);

  useEffect(() => {
    // Initialize authentication
    initAuth();
    
    // Initialize base theme
    initTheme();

    if (typeof window !== 'undefined') {
      // Restore synced user preferences from profile if available
      const savedUserStr = localStorage.getItem('user');
      let profileLang = null;
      let profileTheme = null;

      if (savedUserStr) {
        try {
          const user = JSON.parse(savedUserStr);
          profileLang = user.language;
          profileTheme = user.theme;
        } catch (e) {
          console.error('Failed to parse user profile from localStorage:', e);
        }
      }

      // Sync language preference
      const activeLang = profileLang || localStorage.getItem('lang');
      if (activeLang) {
        setLanguage(activeLang as any);
      }

      // Sync theme preference
      const activeTheme = profileTheme || localStorage.getItem('theme');
      if (activeTheme) {
        // Resolve system theme dynamically on startup if requested
        const targetTheme = activeTheme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : activeTheme;
        useThemeStore.getState().setTheme(targetTheme as any);
      }
    }
  }, [initAuth, initTheme, setLanguage]);

  return null;
}
