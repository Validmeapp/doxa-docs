// Supported locales
export const locales = ['en', 'es', 'pt'] as const;
export type Locale = (typeof locales)[number];

// Locale configuration
export const localeConfig = {
  en: {
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
  },
  es: {
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
  },
  pt: {
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
  },
} as const;

// Default locale
export const defaultLocale: Locale = 'en';

// Validate locale
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}