import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeScript } from '@/components/theme-script';
import { KeyboardNavigationProvider } from '@/components/keyboard-navigation-provider';
import { AccessibilityChecker } from '@/components/accessibility-checker';
import { StructuredData } from '@/components/structured-data';
import { LocaleRedirect } from '@/components/locale-redirect';
import { LocaleHtmlAttributes } from '@/components/locale-html-attributes';
import { generateOrganizationJsonLd } from '@/lib/metadata-generator';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Documentation Portal',
    template: '%s | Documentation Portal',
  },
  description: 'Modern multilingual documentation portal with enterprise-grade UX for API documentation and knowledge base content.',
  keywords: ['documentation', 'API', 'multilingual', 'developer', 'guides'],
  authors: [{ name: 'Documentation Team' }],
  creator: 'Documentation Portal',
  publisher: 'Documentation Portal',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
    languages: {
      'en': '/en',
      'es': '/es',
      'pt': '/pt',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Documentation Portal',
    description: 'Modern multilingual documentation portal with enterprise-grade UX for API documentation and knowledge base content.',
    siteName: 'Documentation Portal',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Documentation Portal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Documentation Portal',
    description: 'Modern multilingual documentation portal with enterprise-grade UX for API documentation and knowledge base content.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationData = generateOrganizationJsonLd();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <StructuredData data={organizationData} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <KeyboardNavigationProvider />
          <AccessibilityChecker />
          <LocaleRedirect />
          <LocaleHtmlAttributes />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
