import { LocaleRedirect } from '@/components/locale-redirect';

export default function RootPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Redirecting to your preferred language...
        </p>
      </div>
      <LocaleRedirect />
    </div>
  );
}