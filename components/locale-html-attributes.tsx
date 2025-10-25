'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { locales, localeConfig } from '@/lib/locale-config';

export function LocaleHtmlAttributes() {
  const pathname = usePathname();

  useEffect(() => {
    // Extract locale from pathname
    const pathSegments = pathname.split('/').filter(Boolean);
    const currentLocale = pathSegments[0];

    // Check if the current locale is valid
    if (locales.includes(currentLocale as any)) {
      const localeInfo = localeConfig[currentLocale as keyof typeof localeConfig];
      
      // Update HTML lang attribute
      document.documentElement.lang = currentLocale;
      
      // Update HTML dir attribute
      document.documentElement.dir = localeInfo.direction;
    } else {
      // Default to English
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  }, [pathname]);

  return null;
}