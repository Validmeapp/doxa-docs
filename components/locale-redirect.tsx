'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { locales, defaultLocale } from '@/lib/locale-config';

function getPreferredLocale(): string {
  if (typeof window === 'undefined') return defaultLocale;
  
  // Check localStorage first
  const stored = localStorage.getItem('preferred-locale');
  if (stored && locales.includes(stored as any)) {
    return stored;
  }
  
  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  
  // Check exact match
  if (locales.includes(browserLang as any)) {
    return browserLang;
  }
  
  // Check language code only (e.g., 'en' from 'en-US')
  const languageCode = browserLang.split('-')[0];
  if (locales.includes(languageCode as any)) {
    return languageCode;
  }
  
  return defaultLocale;
}

export function LocaleRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Only redirect if we're on the root path
    if (pathname === '/') {
      const preferredLocale = getPreferredLocale();
      router.replace(`/${preferredLocale}`);
    }
  }, [pathname, router]);
  
  return null;
}