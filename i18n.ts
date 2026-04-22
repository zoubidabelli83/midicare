// i18n.ts (project root)
import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'fr', 'ar'] as const;
export type Locale = typeof locales[number];

export default getRequestConfig(async ({ requestLocale }) => {
  // ✅ Await requestLocale (it's a Promise in next-intl v3+)
  let locale = await requestLocale;
  
  // Validate locale
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en'; // Fallback
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});