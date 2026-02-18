import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales, type Locale } from '@/lib/locale-config';

function resolvePreferredLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get('preferred-locale')?.value?.toLowerCase();
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  const acceptLanguage = request.headers.get('accept-language') || '';
  const languagePreferences = acceptLanguage
    .split(',')
    .map((part) => {
      const [rawLang, rawQ] = part.trim().split(';q=');
      const lang = rawLang?.toLowerCase();
      const q = rawQ ? Number.parseFloat(rawQ) : 1;
      return { lang, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((item) => !!item.lang)
    .sort((a, b) => b.q - a.q);

  for (const preference of languagePreferences) {
    const lang = preference.lang as string;
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }

    const baseLang = lang.split('-')[0];
    if (locales.includes(baseLang as Locale)) {
      return baseLang as Locale;
    }
  }

  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Keep locale-prefixed routes untouched (e.g. /en/docs, /es/docs).
  if (locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))) {
    return NextResponse.next();
  }

  // Root should always go to /docs first.
  if (pathname === '/') {
    const url = new URL(`/docs${search}`, request.url);
    return NextResponse.redirect(url);
  }

  // Locale-aware docs aliases: /docs and /docs/*
  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    const locale = resolvePreferredLocale(request);
    const docsSuffix = pathname === '/docs' ? '' : pathname.slice('/docs'.length);
    const targetPath = `/${locale}/docs${docsSuffix}`;
    const url = new URL(`${targetPath}${search}`, request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon|robots.txt|sitemap.xml|search).*)',
  ],
};
