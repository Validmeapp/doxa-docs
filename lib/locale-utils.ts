import { locales, defaultLocale, type Locale } from '@/lib/locale-config';

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale from pathname
 */
export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split('/');
  const potentialLocale = segments[1];
  
  if (isValidLocale(potentialLocale)) {
    return potentialLocale;
  }
  
  return defaultLocale;
}

/**
 * Remove locale from pathname
 */
export function removeLocaleFromPathname(pathname: string, locale: string): string {
  if (pathname.startsWith(`/${locale}`)) {
    const withoutLocale = pathname.slice(`/${locale}`.length);
    return withoutLocale || '/';
  }
  return pathname;
}

/**
 * Add locale to pathname
 */
export function addLocaleToPathname(pathname: string, locale: Locale): string {
  // Remove leading slash if present
  const cleanPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  
  // If path is empty, just return locale
  if (!cleanPath) {
    return `/${locale}`;
  }
  
  return `/${locale}/${cleanPath}`;
}

/**
 * Get localized path for a given locale
 */
export function getLocalizedPath(currentPath: string, targetLocale: Locale): string {
  const currentLocale = getLocaleFromPathname(currentPath);
  const pathWithoutLocale = removeLocaleFromPathname(currentPath, currentLocale);
  return addLocaleToPathname(pathWithoutLocale, targetLocale);
}

/**
 * Parse Accept-Language header to get preferred locales
 */
export function parseAcceptLanguage(acceptLanguage: string): Locale[] {
  if (!acceptLanguage) {
    return [defaultLocale];
  }

  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, quality = '1'] = lang.trim().split(';q=');
      return {
        locale: locale.toLowerCase(),
        quality: parseFloat(quality),
      };
    })
    .sort((a, b) => b.quality - a.quality);

  const supportedLocales: Locale[] = [];

  for (const { locale } of languages) {
    // Check exact match
    if (isValidLocale(locale)) {
      supportedLocales.push(locale);
      continue;
    }
    
    // Check language code only (e.g., 'en' from 'en-US')
    const languageCode = locale.split('-')[0];
    if (isValidLocale(languageCode)) {
      supportedLocales.push(languageCode);
    }
  }

  // Always include default locale as fallback
  if (!supportedLocales.includes(defaultLocale)) {
    supportedLocales.push(defaultLocale);
  }

  return supportedLocales;
}

/**
 * Get the best matching locale from Accept-Language header
 */
export function getBestMatchingLocale(acceptLanguage: string): Locale {
  const preferredLocales = parseAcceptLanguage(acceptLanguage);
  return preferredLocales[0] || defaultLocale;
}